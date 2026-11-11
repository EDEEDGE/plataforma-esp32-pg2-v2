
import { db } from '../../../prisma/db.ts';

// ============================================
// REPORTE GENERAL DE UN PROYECTO
// ============================================

export const getProjectSummary = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Buscar proyecto
    const project = await db.orm.public.Project.first({
      id: projectId
    });

    if (!project) {
      return res.status(404).json({
        message: 'Proyecto no encontrado'
      });
    }

    // Verificar que el usuario pertenezca a la sala
    const membership = await db.orm.public.RoomMember.first({
      roomId: project.roomId,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este proyecto'
      });
    }

    // Consultar dispositivos del proyecto
    const devices = await db.orm.public.Device
      .where({ projectId })
      .all();

    // Consultar despliegues del proyecto
    const deployments = await db.orm.public.Deployment
      .where({ projectId })
      .all();

    // Obtener las instalaciones de cada despliegue
    const groups = await Promise.all(
      deployments.map(deployment =>
        db.orm.public.DeploymentDevice
          .where({ deploymentId: deployment.id })
          .all()
      )
    );

    const installations = groups.flat();

    // Contar instalaciones por estado
    const countStatus = (status) =>
      installations.filter(item => item.status === status).length;

    const installed = countStatus('INSTALLED');
    const failed = countStatus('FAILED');
    const pending = countStatus('PENDING');
    const superseded = countStatus('SUPERSEDED');

    // Calcular porcentaje de éxito
    const completed = installed + failed;

    const successRate = completed > 0
      ? Number(((installed / completed) * 100).toFixed(2))
      : null;

    // Respuesta para el frontend
    return res.status(200).json({
      message: 'Resumen del proyecto generado correctamente',

      project: {
        id: project.id,
        name: project.name
      },

      devices: {
        total: devices.length,
        active: devices.filter(d => d.isActive).length,
        paired: devices.filter(d => d.isPaired).length
      },

      deployments: {
        total: deployments.length
      },

      installations: {
        total: installations.length,
        installed,
        failed,
        pending,
        superseded,
        successRate
      }
    });

  } catch (error) {
    console.error('Error generando resumen:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// REPORTE: HISTORIAL DE ACTUALIZACIONES
// ============================================

export const getProjectUpdateHistory = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Buscar proyecto
    const project = await db.orm.public.Project.first({
      id: projectId
    });

    if (!project) {
      return res.status(404).json({
        message: 'Proyecto no encontrado'
      });
    }

    // Verificar acceso del usuario
    const membership = await db.orm.public.RoomMember.first({
      roomId: project.roomId,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este proyecto'
      });
    }

    // Obtener dispositivos del proyecto
    const devices = await db.orm.public.Device
      .where({ projectId })
      .all();

    const deviceMap = new Map(
      devices.map(device => [device.id, device])
    );

    // Obtener despliegues
    const deployments = await db.orm.public.Deployment
      .where({ projectId })
      .all();

    const history = [];

    for (const deployment of deployments) {

      // Buscar versión del despliegue
      const firmwareVersion =
        await db.orm.public.FirmwareVersion.first({
          id: deployment.firmwareVersionId
        });

      // Buscar dispositivos asignados
      const assignments =
        await db.orm.public.DeploymentDevice
          .where({
            deploymentId: deployment.id
          })
          .all();

      for (const assignment of assignments) {

        const device = deviceMap.get(assignment.deviceId);

        history.push({
          deploymentId: deployment.id,
          deploymentDeviceId: assignment.id,

          device: {
            id: assignment.deviceId,
            name: device?.name ?? 'Dispositivo no encontrado',
            deviceType: device?.deviceType ?? null
          },

          firmware: {
            id: deployment.firmwareVersionId,
            version: firmwareVersion?.version ?? null
          },

          status: assignment.status,
          assignedAt: assignment.assignedAt,
          installedAt: assignment.installedAt,
          errorMessage: assignment.errorMessage
        });
      }
    }

    // Mostrar primero las asignaciones recientes
    history.sort((a, b) =>
      String(b.assignedAt).localeCompare(
        String(a.assignedAt)
      )
    );

    return res.status(200).json({
      message: 'Historial generado correctamente',

      project: {
        id: project.id,
        name: project.name
      },

      total: history.length,
      history
    });

  } catch (error) {
    console.error(
      'Error generando historial de actualizaciones:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// REPORTE 3: DISPOSITIVOS DEL PROYECTO
// ============================================

export const getProjectDevicesReport = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Buscar proyecto
    const project = await db.orm.public.Project.first({
      id: projectId
    });

    if (!project) {
      return res.status(404).json({
        message: 'Proyecto no encontrado'
      });
    }

    // Verificar acceso del usuario
    const membership = await db.orm.public.RoomMember.first({
      roomId: project.roomId,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este proyecto'
      });
    }

    // Obtener dispositivos
    const devices = await db.orm.public.Device
      .where({ projectId })
      .all();

    // Preparar información para React
    const report = devices.map(device => ({
      id: device.id,
      name: device.name,
      deviceType: device.deviceType,
      isActive: device.isActive,
      isPaired: device.isPaired
    }));

    return res.status(200).json({
      message: 'Reporte de dispositivos generado correctamente',

      project: {
        id: project.id,
        name: project.name
      },

      summary: {
        total: devices.length,
        active: devices.filter(d => d.isActive).length,
        inactive: devices.filter(d => !d.isActive).length,
        paired: devices.filter(d => d.isPaired).length,
        unpaired: devices.filter(d => !d.isPaired).length
      },

      devices: report
    });

  } catch (error) {
    console.error(
      'Error generando reporte de dispositivos:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};