// ============================================================
// Model Index — All entity models
// ============================================================

const { createModel } = require('./base');

module.exports = {
  Organization:       createModel('organizations', 'org_id'),
  Workspace:          createModel('workspaces', 'workspace_id'),
  User:               createModel('users', 'user_id'),
  Role:               createModel('roles', 'role_id'),
  Persona:            createModel('personas', 'persona_id'),
  PersonaOnboarding:  createModel('persona_onboarding', 'onboarding_id'),
  PersonaContext:     createModel('persona_contexts', 'context_id'),
  Connector:          createModel('connectors', 'connector_id'),
  ConnectorInstance:  createModel('connector_instances', 'instance_id'),
  Skill:              createModel('skills', 'skill_id'),
  SkillVersion:       createModel('skill_versions', 'skill_version_id'),
  KnowledgeBase:      createModel('knowledge_bases', 'kb_id'),
  Document:           createModel('documents', 'document_id'),
  Agent:              createModel('agents', 'agent_id'),
  AgentVersion:       createModel('agent_versions', 'version_id'),
  Template:           createModel('templates', 'template_id'),
  AgentRun:           createModel('agent_runs', 'run_id'),
  RunStep:            createModel('run_steps', 'step_id'),
  HumanReview:        createModel('human_reviews', 'review_id'),
  GovernancePolicy:   createModel('governance_policies', 'policy_id'),
  UsageMetric:        createModel('usage_metrics', 'metric_id'),
};
