import { AgentRelay } from '@agent-relay/sdk'
const relay = await AgentRelay.createWorkspace({ name: 'unghosted-test' })
console.log('KEY', relay.workspaceKey)
