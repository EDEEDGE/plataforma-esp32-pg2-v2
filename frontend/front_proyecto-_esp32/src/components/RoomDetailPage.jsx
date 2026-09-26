import { useEffect, useState } from 'react';
import {
  cancelRoomInvitation,
  changeRoomMemberRole,
  getRoomInvitations,
  getRoomMembers,
  getRoomById,
  inviteRoomMember,
  leaveRoom,
  removeRoomMember,
  updateRoom,
  updateRoomStatus,
} from '../services/roomService.js';
import {
  createProject,
  getRoomProjects,
  updateProject,
  updateProjectStatus,
} from '../services/projectService.js';
import ProjectDevices from './ProjectDevices.jsx';
import '../styles/rooms.css';

export default function RoomDetailPage({ roomId, userId, onBack }) {
  const [room, setRoom] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [memberError, setMemberError] = useState('');
  const [invitationError, setInvitationError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [savingMemberId, setSavingMemberId] = useState(null);
  const [savingInvitationId, setSavingInvitationId] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [projectFormError, setProjectFormError] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [creatingProject, setCreatingProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingProjectForm, setEditingProjectForm] = useState({ name: '', description: '' });
  const [savingProjectId, setSavingProjectId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadRoom = async () => {
      try {
        const loadedRoom = await getRoomById(roomId);
        if (isMounted) {
          setRoom(loadedRoom);
          setForm({
            name: loadedRoom.name,
            description: loadedRoom.description || '',
          });
          const canManageInvitations = ['OWNER', 'ADMIN'].includes(loadedRoom.role);
          const [membersResult, invitationsResult, projectsResult] = await Promise.allSettled([
            getRoomMembers(roomId),
            canManageInvitations ? getRoomInvitations(roomId) : Promise.resolve([]),
            getRoomProjects(roomId),
          ]);

          if (!isMounted) {
            return;
          }

          if (membersResult.status === 'fulfilled') {
            setMembers(membersResult.value);
          } else {
            setMemberError(membersResult.reason.message || 'No se pudieron cargar los miembros.');
          }

          if (invitationsResult.status === 'fulfilled') {
            setInvitations(invitationsResult.value);
          } else {
            setInvitationError(
              invitationsResult.reason.message || 'No se pudieron cargar las invitaciones.'
            );
          }

          if (projectsResult.status === 'fulfilled') {
            setProjects(projectsResult.value);
          } else {
            setProjectsError(
              projectsResult.reason.message || 'No se pudieron cargar los proyectos.'
            );
          }
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'No se pudo cargar la sala.');
        }
      } finally {
        if (isMounted) {
          setProjectsLoading(false);
          setLoading(false);
        }
      }
    };

    loadRoom();
    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const handleEdit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await updateRoom(roomId, {
        name: form.name.trim(),
        description: form.description.trim(),
      });
      setRoom(result.room);
      setForm({
        name: result.room.name,
        description: result.room.description || '',
      });
      setEditing(false);
      setMessage(result.message || 'Sala actualizada correctamente.');
    } catch (saveError) {
      setError(saveError.message || 'No se pudo actualizar la sala.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async () => {
    if (!room) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await updateRoomStatus(roomId, !room.isActive);
      setRoom((currentRoom) => ({ ...currentRoom, ...result.room }));
      setEditing(false);
      setMessage(result.message || 'Estado de la sala actualizado.');
    } catch (statusError) {
      setError(statusError.message || 'No se pudo cambiar el estado de la sala.');
    } finally {
      setSaving(false);
    }
  };

  const refreshInvitations = async () => {
    setInvitationError('');
    setInvitations(await getRoomInvitations(roomId));
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    setInviting(true);
    setInvitationError('');
    setMessage('');

    try {
      const result = await inviteRoomMember(roomId, inviteEmail.trim());
      setInviteEmail('');
      await refreshInvitations();
      setMessage(result.message || 'Invitación enviada correctamente.');
    } catch (inviteError) {
      setInvitationError(inviteError.message || 'No se pudo enviar la invitación.');
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvitation = async (invitation) => {
    if (!window.confirm(`¿Cancelar la invitación para ${invitation.invitedEmail}?`)) {
      return;
    }

    setSavingInvitationId(invitation.id);
    setInvitationError('');
    setMessage('');
    try {
      const result = await cancelRoomInvitation(roomId, invitation.id);
      await refreshInvitations();
      setMessage(result.message || 'Invitación cancelada correctamente.');
    } catch (cancelError) {
      setInvitationError(cancelError.message || 'No se pudo cancelar la invitación.');
    } finally {
      setSavingInvitationId(null);
    }
  };

  const handleRoleChange = async (member, role) => {
    setSavingMemberId(member.id);
    setMemberError('');
    setMessage('');
    try {
      const updatedMember = await changeRoomMemberRole(roomId, member.id, role);
      setMembers((currentMembers) =>
        currentMembers.map((currentMember) =>
          currentMember.id === updatedMember.userId
            ? { ...currentMember, role: updatedMember.role }
            : currentMember
        )
      );
      setMessage('Rol del miembro actualizado correctamente.');
    } catch (roleError) {
      setMemberError(roleError.message || 'No se pudo cambiar el rol del miembro.');
    } finally {
      setSavingMemberId(null);
    }
  };

  const handleRemoveMember = async (member) => {
    const memberName = [member.firstName, member.lastName].filter(Boolean).join(' ')
      || member.username
      || member.email;
    if (!window.confirm(`¿Eliminar a ${memberName} de esta sala?`)) {
      return;
    }

    setSavingMemberId(member.id);
    setMemberError('');
    setMessage('');
    try {
      const result = await removeRoomMember(roomId, member.id);
      setMembers((currentMembers) =>
        currentMembers.filter((currentMember) => currentMember.id !== member.id)
      );
      setMessage(result.message || 'Miembro eliminado correctamente.');
    } catch (removeError) {
      setMemberError(removeError.message || 'No se pudo eliminar al miembro.');
    } finally {
      setSavingMemberId(null);
    }
  };

  const handleLeaveRoom = async () => {
    if (!window.confirm(`¿Quieres salir de la sala “${room.name}”?`)) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await leaveRoom(roomId);
      onBack();
    } catch (leaveError) {
      setError(leaveError.message || 'No se pudo salir de la sala.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();
    setCreatingProject(true);
    setProjectFormError('');
    setMessage('');

    try {
      const result = await createProject(roomId, {
        name: projectForm.name.trim(),
        description: projectForm.description.trim(),
      });
      setProjects((currentProjects) => [result.project, ...currentProjects]);
      setProjectForm({ name: '', description: '' });
      setShowProjectForm(false);
      setMessage(result.message || 'Proyecto creado correctamente.');
    } catch (createError) {
      setProjectFormError(createError.message || 'No se pudo crear el proyecto.');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleUpdateProject = async (event, projectId) => {
    event.preventDefault();
    setSavingProjectId(projectId);
    setProjectFormError('');
    setMessage('');

    try {
      const result = await updateProject(projectId, {
        name: editingProjectForm.name.trim(),
        description: editingProjectForm.description.trim(),
      });
      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === projectId
            ? { ...project, ...result.project, roomId: project.roomId }
            : project
        )
      );
      setEditingProjectId(null);
      setMessage(result.message || 'Proyecto actualizado correctamente.');
    } catch (updateError) {
      setProjectFormError(updateError.message || 'No se pudo actualizar el proyecto.');
    } finally {
      setSavingProjectId(null);
    }
  };

  const handleProjectStatusChange = async (project) => {
    const action = project.isActive ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Quieres ${action} el proyecto “${project.name}”?`)) {
      return;
    }

    setSavingProjectId(project.id);
    setProjectFormError('');
    setMessage('');
    try {
      const result = await updateProjectStatus(project.id, !project.isActive);
      setProjects((currentProjects) =>
        currentProjects.map((currentProject) =>
          currentProject.id === project.id
            ? { ...currentProject, ...result.project }
            : currentProject
        )
      );
      setMessage(result.message || 'Estado del proyecto actualizado.');
    } catch (statusError) {
      setProjectFormError(statusError.message || 'No se pudo cambiar el estado del proyecto.');
    } finally {
      setSavingProjectId(null);
    }
  };

  const canEdit = room && room.isActive && ['OWNER', 'ADMIN'].includes(room.role);
  const canChangeStatus = room?.role === 'OWNER';
  const canManageMembers = room && room.isActive && ['OWNER', 'ADMIN'].includes(room.role);
  const canManageInvitations = room && ['OWNER', 'ADMIN'].includes(room.role);
  const canChangeRoles = room?.isActive && room.role === 'OWNER';
  const canManageProjects = room && room.isActive && ['OWNER', 'ADMIN'].includes(room.role);
  const isOwner = room?.role === 'OWNER';

  return (
    <section className="room-detail">
      <div className="room-detail-toolbar">
        <button type="button" className="secondary-button" onClick={onBack}>
          Volver a Mis salas
        </button>
        {room && canChangeStatus ? (
          <button
            type="button"
            className={room.isActive ? 'danger-button' : ''}
            onClick={handleStatusChange}
            disabled={saving}
          >
            {saving
              ? 'Actualizando...'
              : room.isActive
                ? 'Desactivar sala'
                : 'Activar sala'}
          </button>
        ) : null}
      </div>

      {error ? <p className="form-error rooms-feedback" role="alert">{error}</p> : null}
      {message ? <p className="form-message rooms-feedback" role="status">{message}</p> : null}

      {loading ? (
        <article className="card rooms-empty-state" role="status">
          <p>Cargando información de la sala...</p>
        </article>
      ) : room ? (
        <article className="card room-detail-card">
          <div className="room-detail-heading">
            <div>
              <p className="room-label">Detalle de sala</p>
              <h3>{room.name}</h3>
            </div>
            <span className={`room-status${room.isActive ? '' : ' is-inactive'}`}>
              {room.isActive ? 'Activa' : 'Desactivada'}
            </span>
          </div>

          <p className="room-role">Tu rol: {room.role}</p>

          {!room.isActive ? (
            <p className="room-readonly-note" role="note">
              Esta sala está desactivada y se muestra en modo de solo consulta.
              {canChangeStatus ? ' Puedes reactivarla para permitir cambios.' : ''}
            </p>
          ) : null}

          {editing && canEdit ? (
            <form className="user-form" onSubmit={handleEdit}>
              <label className="field" htmlFor="edit-room-name">
                <span>Nombre de la sala</span>
                <input
                  id="edit-room-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  maxLength={120}
                  required
                />
              </label>
              <label className="field" htmlFor="edit-room-description">
                <span>Descripción <small>(opcional)</small></span>
                <textarea
                  id="edit-room-description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  rows={3}
                  maxLength={500}
                />
              </label>
              <div className="room-detail-actions">
                <button type="submit" disabled={saving || !form.name.trim()}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setForm({
                      name: room.name,
                      description: room.description || '',
                    });
                    setEditing(false);
                    setError('');
                  }}
                  disabled={saving}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="room-detail-description">
                <h4>Descripción</h4>
                <p>{room.description || 'Esta sala no tiene descripción.'}</p>
              </div>
              {canEdit ? (
                <button type="button" onClick={() => setEditing(true)}>
                  Editar sala
                </button>
              ) : null}
            </>
          )}

          <section className="room-detail-section" aria-labelledby="room-projects-heading">
            <div className="room-section-heading">
              <div>
                <h4 id="room-projects-heading">Proyectos</h4>
                <p>Organiza los dispositivos de esta sala por propósito.</p>
              </div>
              {canManageProjects ? (
                <button
                  type="button"
                  onClick={() => {
                    setProjectFormError('');
                    setShowProjectForm((current) => !current);
                  }}
                  aria-expanded={showProjectForm}
                >
                  {showProjectForm ? 'Cancelar' : 'Crear proyecto'}
                </button>
              ) : null}
            </div>

            {!room.isActive ? (
              <p className="room-readonly-note">
                Los proyectos se pueden consultar, pero no modificar mientras la sala esté desactivada.
              </p>
            ) : null}

            {showProjectForm && canManageProjects ? (
              <form className="user-form room-project-form" onSubmit={handleCreateProject}>
                <label className="field" htmlFor="new-project-name">
                  <span>Nombre del proyecto</span>
                  <input
                    id="new-project-name"
                    value={projectForm.name}
                    onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })}
                    maxLength={120}
                    autoComplete="off"
                    required
                  />
                </label>
                <label className="field" htmlFor="new-project-description">
                  <span>Descripción <small>(opcional)</small></span>
                  <textarea
                    id="new-project-description"
                    value={projectForm.description}
                    onChange={(event) =>
                      setProjectForm({ ...projectForm, description: event.target.value })
                    }
                    rows={3}
                    maxLength={500}
                  />
                </label>
                {projectFormError ? (
                  <p className="form-error rooms-feedback" role="alert">{projectFormError}</p>
                ) : null}
                <button type="submit" disabled={creatingProject || !projectForm.name.trim()}>
                  {creatingProject ? 'Creando...' : 'Guardar proyecto'}
                </button>
              </form>
            ) : null}

            {!showProjectForm && projectFormError ? (
              <p className="form-error rooms-feedback" role="alert">{projectFormError}</p>
            ) : null}
            {projectsError ? (
              <p className="form-error rooms-feedback" role="alert">{projectsError}</p>
            ) : null}
            {projectsLoading ? (
              <p className="room-secondary-text" role="status">Cargando proyectos...</p>
            ) : projects.length === 0 && !projectsError ? (
              <p className="room-secondary-text">Aún no hay proyectos en esta sala.</p>
            ) : (
              <div className="room-project-list">
                {projects.map((project) => (
                  <article className="room-project-item" key={project.id}>
                    {editingProjectId === project.id ? (
                      <form
                        className="user-form room-project-form"
                        onSubmit={(event) => handleUpdateProject(event, project.id)}
                      >
                        <label className="field" htmlFor={`project-name-${project.id}`}>
                          <span>Nombre del proyecto</span>
                          <input
                            id={`project-name-${project.id}`}
                            value={editingProjectForm.name}
                            onChange={(event) =>
                              setEditingProjectForm({
                                ...editingProjectForm,
                                name: event.target.value,
                              })
                            }
                            maxLength={120}
                            required
                          />
                        </label>
                        <label className="field" htmlFor={`project-description-${project.id}`}>
                          <span>Descripción <small>(opcional)</small></span>
                          <textarea
                            id={`project-description-${project.id}`}
                            value={editingProjectForm.description}
                            onChange={(event) =>
                              setEditingProjectForm({
                                ...editingProjectForm,
                                description: event.target.value,
                              })
                            }
                            rows={3}
                            maxLength={500}
                          />
                        </label>
                        {projectFormError ? (
                          <p className="form-error rooms-feedback" role="alert">{projectFormError}</p>
                        ) : null}
                        <div className="room-project-actions">
                          <button type="submit" disabled={savingProjectId === project.id}>
                            {savingProjectId === project.id ? 'Guardando...' : 'Guardar cambios'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              setEditingProjectId(null);
                              setProjectFormError('');
                            }}
                            disabled={savingProjectId === project.id}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="room-project-summary">
                          <div>
                            <p className="room-label">Proyecto</p>
                            <h5>{project.name}</h5>
                            <p>{project.description || 'Sin descripción.'}</p>
                          </div>
                          <span className={`room-status${project.isActive ? '' : ' is-inactive'}`}>
                            {project.isActive ? 'Activo' : 'Desactivado'}
                          </span>
                        </div>
                        {canManageProjects ? (
                          <div className="room-project-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => {
                                setProjectFormError('');
                                setEditingProjectForm({
                                  name: project.name,
                                  description: project.description || '',
                                });
                                setEditingProjectId(project.id);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className={project.isActive ? 'danger-button' : 'secondary-button'}
                              onClick={() => handleProjectStatusChange(project)}
                              disabled={savingProjectId === project.id}
                            >
                              {savingProjectId === project.id
                                ? 'Actualizando...'
                                : project.isActive
                                  ? 'Desactivar'
                                  : 'Activar'}
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}
                    <ProjectDevices
                      projectId={project.id}
                      projectActive={project.isActive}
                      roomActive={room.isActive}
                      canManage={canManageProjects}
                    />
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="room-detail-section" aria-labelledby="room-members-heading">
            <div className="room-section-heading">
              <div>
                <h4 id="room-members-heading">Miembros</h4>
                <p>Personas que tienen acceso a esta sala.</p>
              </div>
              {!isOwner ? (
                <button
                  type="button"
                  className="danger-button"
                  onClick={handleLeaveRoom}
                  disabled={saving}
                >
                  Salir de la sala
                </button>
              ) : null}
            </div>

            {isOwner ? (
              <p className="room-readonly-note">
                El propietario no puede salir ni ser eliminado como miembro.
              </p>
            ) : null}
            {memberError ? <p className="form-error rooms-feedback" role="alert">{memberError}</p> : null}
            {members.length === 0 && !memberError ? (
              <p className="room-secondary-text">No hay miembros para mostrar.</p>
            ) : (
              <div className="room-member-list">
                {members.map((member) => {
                  const name = [member.firstName, member.lastName].filter(Boolean).join(' ')
                    || member.username
                    || member.email;
                  const canRemove = canManageMembers
                    && member.role !== 'OWNER'
                    && member.id !== room.ownerId
                    && member.id !== userId
                    && (isOwner || member.role === 'MEMBER');

                  return (
                    <article className="room-member-item" key={member.id}>
                      <div className="room-member-identity">
                        <strong>{name}</strong>
                        <span>{member.email}</span>
                        {!member.isActive ? <small>Cuenta desactivada</small> : null}
                      </div>
                      <div className="room-member-controls">
                        {canChangeRoles && member.role !== 'OWNER' ? (
                          <label className="room-role-control">
                            <span className="visually-hidden">Rol de {name}</span>
                            <select
                              value={member.role}
                              onChange={(event) => handleRoleChange(member, event.target.value)}
                              disabled={savingMemberId === member.id}
                            >
                              <option value="MEMBER">MEMBER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </label>
                        ) : (
                          <span className="room-role">{member.role}</span>
                        )}
                        {canRemove ? (
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => handleRemoveMember(member)}
                            disabled={savingMemberId === member.id}
                          >
                            {savingMemberId === member.id ? 'Procesando...' : 'Eliminar'}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {canManageInvitations ? (
            <section className="room-detail-section" aria-labelledby="room-invitations-heading">
              <div className="room-section-heading">
                <div>
                  <h4 id="room-invitations-heading">Invitaciones</h4>
                  <p>Invita por correo; la persona deberá aceptar desde su cuenta.</p>
                </div>
              </div>

              <form className="room-invite-form" onSubmit={handleInvite}>
                <label className="field" htmlFor="room-invite-email">
                  <span>Correo de la persona</span>
                  <input
                    id="room-invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    autoComplete="email"
                    required
                    disabled={!room.isActive || inviting}
                  />
                </label>
                <button type="submit" disabled={!room.isActive || inviting || !inviteEmail.trim()}>
                  {inviting ? 'Enviando...' : 'Enviar invitación'}
                </button>
              </form>

              {!room.isActive ? (
                <p className="room-secondary-text">No se pueden enviar invitaciones a una sala desactivada.</p>
              ) : null}
              {invitationError ? (
                <p className="form-error rooms-feedback" role="alert">{invitationError}</p>
              ) : null}
              {invitations.length === 0 && !invitationError ? (
                <p className="room-secondary-text">No hay invitaciones registradas.</p>
              ) : (
                <div className="room-invitation-list">
                  {invitations.map((invitation) => (
                    <article className="room-invitation-item" key={invitation.id}>
                      <div className="room-member-identity">
                        <strong>{invitation.invitedEmail}</strong>
                        <span>
                          {invitation.status === 'PENDING'
                            ? `Pendiente · vence ${new Date(invitation.expiresAt).toLocaleString()}`
                            : invitation.status === 'ACCEPTED'
                              ? 'Aceptada'
                              : invitation.status === 'REJECTED'
                                ? 'Rechazada'
                                : 'Expirada'}
                        </span>
                      </div>
                      {invitation.status === 'PENDING' ? (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleCancelInvitation(invitation)}
                          disabled={savingInvitationId === invitation.id}
                        >
                          {savingInvitationId === invitation.id ? 'Cancelando...' : 'Cancelar invitación'}
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
