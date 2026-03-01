import { createCrudStore } from './crudFactory'

export const useAgentsStore     = createCrudStore('agents',     '/agents')
export { useSkillsStore }        from './skills'
export const useConnectorsStore = createCrudStore('connectors', '/connectors')
export const useTemplatesStore  = createCrudStore('templates',  '/templates')
export const usePersonasStore   = createCrudStore('personas',   '/personas')
export const useRunsStore       = createCrudStore('runs',       '/runs')
