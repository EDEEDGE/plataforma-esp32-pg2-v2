import { request } from './http.js';

const normalizeProject = (project) => ({
  id: project.id,
  roomId: project.roomId,
  name: project.name,
  description: project.description,
  isActive: project.isActive,
  createdById: project.createdById,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});

export async function getRoomProjects(roomId) {
  const data = await request(`/rooms/${roomId}/projects`, {
    auth: true,
    fallbackMessage: 'No se pudieron cargar los proyectos',
  });

  if (!Array.isArray(data.projects)) {
    throw new Error('La respuesta del servidor no contiene la lista de proyectos.');
  }

  return data.projects.map((project) => normalizeProject({ ...project, roomId }));
}

export async function createProject(roomId, projectData) {
  const data = await request(`/rooms/${roomId}/projects`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(projectData),
    fallbackMessage: 'No se pudo crear el proyecto',
  });

  if (!data.project) {
    throw new Error('La respuesta del servidor no contiene el proyecto creado.');
  }

  return {
    message: data.message,
    project: normalizeProject(data.project),
  };
}

export async function updateProject(projectId, projectData) {
  const data = await request(`/projects/${projectId}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(projectData),
    fallbackMessage: 'No se pudo actualizar el proyecto',
  });

  if (!data.project) {
    throw new Error('La respuesta del servidor no contiene el proyecto actualizado.');
  }

  return {
    message: data.message,
    project: normalizeProject(data.project),
  };
}

export async function updateProjectStatus(projectId, isActive) {
  const data = await request(`/projects/${projectId}/status`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ isActive }),
    fallbackMessage: 'No se pudo cambiar el estado del proyecto',
  });

  if (!data.project || typeof data.project.isActive !== 'boolean') {
    throw new Error('La respuesta del servidor no contiene el nuevo estado del proyecto.');
  }

  return {
    message: data.message,
    project: data.project,
  };
}
