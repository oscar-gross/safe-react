import { AbiItem } from 'web3-utils'

export interface ContractNetworkConfig {
  /** multiSendAddress - Address of the MultiSend contract deployed on a specific network */
  multiSendAddress: string
  /** multiSendAbi - Abi of the MultiSend contract deployed on a specific network */
  multiSendAbi?: AbiItem | AbiItem[]
  /** safeMasterCopyAddress - Address of the Gnosis Safe Master Copy contract deployed on a specific network */
  safeMasterCopyAddress: string
  safeMasterCopyAbi?: AbiItem | AbiItem[]
  safeProxyFactoryAddress: string
  safeProxyFactoryAbi?: AbiItem | AbiItem[]
}

export interface ContractNetworksConfig {
  [id: string]: ContractNetworkConfig
}
