import { getProjectDevices } from './deviceService.js';
import { getRoomProjects } from './projectService.js';
import { getMyRooms } from './roomService.js';

/**
 * Builds a dashboard overview from the rooms, projects and devices visible
 * to the current user. The current backend does not expose a summary endpoint.
 */
export async function getDeviceOverview() {
  const rooms = await getMyRooms();
  const projectGroups = await Promise.all(
    rooms.map(async (room) => ({
      room,
      projects: await getRoomProjects(room.id),
    }))
  );
  const projectGroupsWithDevices = await Promise.all(
    projectGroups.map(async ({ room, projects }) => ({
      room,
      projects: await Promise.all(
        projects.map(async (project) => ({
          project,
          devices: await getProjectDevices(project.id),
        }))
      ),
    }))
  );

  const devices = projectGroupsWithDevices.flatMap(({ room, projects }) =>
    projects.flatMap(({ project, devices: projectDevices }) =>
      projectDevices.map((device) => ({
        ...device,
        roomName: room.name,
        projectName: project.name,
      }))
    )
  );

  const latestCommunication = devices
    .map((device) => device.lastSeenAt)
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null;

  return {
    deviceCount: devices.length,
    activeDeviceCount: devices.filter((device) => device.isActive).length,
    pairedDeviceCount: devices.filter((device) => device.isPaired).length,
    latestCommunication,
  };
}
