import { parseAbiItem } from 'viem'

export const REGISTERED = parseAbiItem('event Registered(uint256 indexed agentId, string agentURI, address indexed owner)')
export const URI_UPDATED = parseAbiItem('event URIUpdated(uint256 indexed agentId, string newURI, address indexed updater)')
