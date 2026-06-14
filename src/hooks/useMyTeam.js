import { useAuth } from '../context/AuthContext';

// Returns the set of CSM names the current user is allowed to assign work to.
// Admins:       teamNames = null  → callers should show the full org-wide list.
// CSM leads:    teamNames = [self, ...reportees]  (isLead = true)
// Regular CSMs: teamNames = [self]                (isLead = false)
//
// teamMembers carries {id, name, csm_name} for every member when you also
// need the user ID (e.g. tasks assigned_to_id).
export function useMyTeam() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const selfName = user?.csm_name || user?.name || '';
  const selfId   = user?.id ?? null;

  const reportees   = user?.reportees || [];
  const isLead      = reportees.length > 0;

  const selfMember  = { id: selfId, name: user?.name || '', csm_name: user?.csm_name || '' };
  const teamMembers = isAdmin
    ? null
    : [selfMember, ...reportees];

  const teamNames = isAdmin
    ? null
    : [selfName, ...reportees.map(r => r.csm_name || r.name)].filter(Boolean);

  return { teamNames, teamMembers, isLead, selfName, selfId, isAdmin };
}
