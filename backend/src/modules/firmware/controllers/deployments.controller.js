import { db } from '../../../prisma/db.ts';

// Comparar versiones X.Y.Z
const compararVersionesFirmware = (a, b) => {
  const patron = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;

  if (
    typeof a !== 'string' ||
    typeof b !== 'string' ||
    !patron.test(a) ||
    !patron.test(b)
  ) {
    return null;
  }

  const versionA = a.split('.').map(Number);
  const versionB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (versionA[i] > versionB[i]) return 1;
    if (versionA[i] < versionB[i]) return -1;
  }

  return 0;
};

// Crear despliegue de firmware
export const createDeployment = async (req, res) => {
  let createdDeploymentId = null;

  try {
    const { projectId } = req.params;

    const {
      firmwareVersionId,
      targetAll = false,
      deviceIds = []
    } = req.body;


    // Validar versión
    if (!firmwareVersionId) {
      return res.status(400).json({
        message: 'Debe seleccionar una versión de firmware'
      });
    }


    // Validar targetAll
    if (typeof targetAll !== 'boolean') {
      return res.status(400).json({
        message: 'targetAll debe ser true o false'
      });
    }


    // Si no es para todos, debe seleccionar dispositivos
    if (
      !targetAll &&
      (!Array.isArray(deviceIds) || deviceIds.length === 0)
    ) {
      return res.status(400).json({
        message: 'Debe seleccionar al menos un dispositivo'
      });
    }


    // Buscar proyecto
    const project =
      await db.orm.public.Project.first({
        id: projectId
      });

    if (!project) {
      return res.status(404).json({
        message: 'Proyecto no encontrado'
      });
    }

    if (!project.isActive) {
      return res.status(409).json({
        message: 'El proyecto está desactivado'
      });
    }


    // Buscar sala
    const room =
      await db.orm.public.Room.first({
        id: project.roomId
      });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    if (!room.isActive) {
      return res.status(409).json({
        message: 'La sala está desactivada'
      });
    }


    // Verificar membresía
    const membership =
      await db.orm.public.RoomMember.first({
        roomId: room.id,
        userId: req.user.id
      });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este proyecto'
      });
    }


    // Solo OWNER y ADMIN
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para desplegar firmware'
      });
    }


    // Buscar versión de firmware
    const firmwareVersion =
      await db.orm.public.FirmwareVersion.first({
        id: firmwareVersionId
      });

    if (!firmwareVersion) {
      return res.status(404).json({
        message: 'Versión de firmware no encontrada'
      });
    }


    // La versión debe pertenecer al mismo proyecto
    if (firmwareVersion.projectId !== projectId) {
      return res.status(400).json({
        message: 'La versión no pertenece a este proyecto'
      });
    }


    if (!firmwareVersion.isActive) {
      return res.status(409).json({
        message: 'La versión de firmware está desactivada'
      });
    }


    // Obtener archivos .bin de la versión
    const firmwareFiles =
      await db.orm.public.FirmwareFile
        .where({
          firmwareVersionId
        })
        .all();

    if (firmwareFiles.length === 0) {
      return res.status(409).json({
        message: 'La versión no tiene archivos de firmware'
      });
    }


    // Tipos de dispositivo compatibles con la versión
    const supportedDeviceTypes = new Set(
      firmwareFiles.map((file) => file.deviceType)
    );


    // Obtener dispositivos del proyecto
    const projectDevices =
      await db.orm.public.Device
        .where({
          projectId
        })
        .all();


    let selectedDevices = [];


    // Desplegar a todos
    if (targetAll) {

      selectedDevices = projectDevices.filter(
        (device) =>
          device.isActive &&
          device.isPaired
      );

    } else {

      // Eliminar IDs duplicados
      const uniqueDeviceIds = [...new Set(deviceIds)];

      for (const deviceId of uniqueDeviceIds) {

        const device = projectDevices.find(
          (item) => item.id === deviceId
        );

        if (!device) {
          return res.status(400).json({
            message: `El dispositivo ${deviceId} no pertenece al proyecto`
          });
        }

        if (!device.isActive) {
          return res.status(409).json({
            message: `El dispositivo ${device.name} está desactivado`
          });
        }

        if (!device.isPaired) {
          return res.status(409).json({
            message: `El dispositivo ${device.name} no está vinculado`
          });
        }

        selectedDevices.push(device);
      }
    }


    if (selectedDevices.length === 0) {
      return res.status(409).json({
        message: 'No hay dispositivos disponibles para el despliegue'
      });
    }

    // ============================================
    // VALIDAR VERSIONES ANTES DEL DESPLIEGUE
    // ============================================

    // Evitar instalar versiones iguales o anteriores
    for (const device of selectedDevices) {

      // Buscar historial de asignaciones del dispositivo
      const assignments =
        await db.orm.public.DeploymentDevice
          .where({
            deviceId: device.id
          })
          .all();

      for (const assignment of assignments) {

        // Solo revisar versiones instaladas y pendientes
        if (
          assignment.status !== 'INSTALLED' &&
          assignment.status !== 'PENDING'
        ) {
          continue;
        }

        // Obtener el despliegue anterior
        const previousDeployment =
          await db.orm.public.Deployment.first({
            id: assignment.deploymentId
          });

        if (
          !previousDeployment ||
          previousDeployment.projectId !== projectId
        ) {
          continue;
        }

        // Obtener la versión del despliegue anterior
        const previousVersion =
          await db.orm.public.FirmwareVersion.first({
            id: previousDeployment.firmwareVersionId
          });

        if (!previousVersion) {
          continue;
        }

        // Comparar la nueva versión con la anterior
        const comparison = compararVersionesFirmware(
          firmwareVersion.version,
          previousVersion.version
        );

        // Validar formato
        if (comparison === null) {
          return res.status(409).json({
            message: 'Formato de versión no válido'
          });
        }

        // Impedir versiones iguales o anteriores
        if (comparison <= 0) {
          return res.status(409).json({
            message:
              `El dispositivo ${device.name} tiene la versión ` +
              `${previousVersion.version} en estado ${assignment.status}. ` +
              `Debe seleccionar una versión superior.`
          });
        }
      }
    }



    // Comprobar que exista .bin para cada tipo de dispositivo
    for (const device of selectedDevices) {

      if (!supportedDeviceTypes.has(device.deviceType)) {
        return res.status(409).json({
          message:
            `La versión no tiene un archivo .bin para ${device.deviceType}`
        });
      }
    }


    // Crear Deployment
    const deployment =
      await db.orm.public.Deployment.create({
        projectId,
        firmwareVersionId,
        createdById: req.user.id,
        targetAll
      });

    createdDeploymentId = deployment.id;


    // Crear relación para cada dispositivo
    const deploymentDevices = [];

    for (const device of selectedDevices) {

      const deploymentDevice =
        await db.orm.public.DeploymentDevice.create({
          deploymentId: deployment.id,
          deviceId: device.id
        });

      deploymentDevices.push({
        id: deploymentDevice.id,
        deviceId: device.id,
        deviceName: device.name,
        deviceType: device.deviceType,
        status: deploymentDevice.status
      });
    }


    return res.status(201).json({
      message: 'Despliegue creado correctamente',

      deployment: {
        id: deployment.id,
        projectId: deployment.projectId,
        firmwareVersionId:
          deployment.firmwareVersionId,
        targetAll: deployment.targetAll,
        createdAt: deployment.createdAt,

        devices: deploymentDevices
      }
    });

  } catch (error) {

    // Si algo falla después de crear el Deployment,
    // eliminarlo. DeploymentDevice se elimina por CASCADE.
    if (createdDeploymentId) {
      try {
        await db.orm.public.Deployment
          .where({
            id: createdDeploymentId
          })
          .delete();

      } catch (cleanupError) {
        console.error(
          'Error limpiando deployment:',
          cleanupError
        );
      }
    }

    console.error(
      'Error al crear deployment:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};