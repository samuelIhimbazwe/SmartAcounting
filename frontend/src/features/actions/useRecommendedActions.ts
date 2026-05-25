import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { executeRecommendedAction, getRecommendedActions } from '../../shared/api/actions'
import type { RecommendedAction } from '../../shared/types/dashboard'
import type { Role } from '../../shared/types/roles'

export function useRecommendedActions(role: Role) {
  return useQuery({
    queryKey: ['recommended-actions', role],
    queryFn: () => getRecommendedActions(role),
    staleTime: 60_000,
  })
}

export function useExecuteRecommendedAction(role: Role) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: Pick<RecommendedAction, 'type' | 'id'>) => executeRecommendedAction(action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recommended-actions', role] })
    },
  })
}
