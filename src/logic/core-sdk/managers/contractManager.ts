import { GnosisSafeContract, MultiSendContract } from '@gnosis.pm/safe-core-sdk-types'
import { SAFE_LAST_VERSION } from '../contracts/config'
import { getMultiSendContract, getSafeContract } from '../contracts/safeDeploymentContracts'
import { SafeConfig } from '../Safe'
import { ContractNetworksConfig } from '../types'

class ContractManager {
  contractNetworks?: ContractNetworksConfig
  isL1SafeMasterCopy?: boolean
  safeContract!: GnosisSafeContract
  multiSendContract!: MultiSendContract

  static async create({
    ethAdapter,
    safeAddress,
    isL1SafeMasterCopy,
    contractNetworks,
  }: SafeConfig): Promise<ContractManager> {
    const contractManager = new ContractManager()

    await contractManager.init({ ethAdapter, safeAddress, isL1SafeMasterCopy, contractNetworks })
    return contractManager
  }

  async init({ ethAdapter, safeAddress, isL1SafeMasterCopy, contractNetworks }: SafeConfig): Promise<void> {
    const chainId = await ethAdapter.getChainId()
    const customContracts = contractNetworks?.[chainId]

    this.contractNetworks = contractNetworks
    this.isL1SafeMasterCopy = isL1SafeMasterCopy

    const temporarySafeContract = await getSafeContract({
      ethAdapter,
      safeVersion: SAFE_LAST_VERSION,
      chainId,
      isL1SafeMasterCopy,
      customSafeAddress: safeAddress,
      customContracts,
    })

    const safeVersion = await temporarySafeContract.getVersion()

    this.safeContract = await getSafeContract({
      ethAdapter,
      safeVersion,
      chainId,
      isL1SafeMasterCopy,
      customSafeAddress: safeAddress,
      customContracts,
    })

    this.multiSendContract = await getMultiSendContract({
      ethAdapter,
      safeVersion,
      chainId,
      customContracts,
    })
  }

  get contractNetworks1(): ContractNetworksConfig | undefined {
    return this.contractNetworks
  }

  get isL1SafeMasterCopy1(): boolean | undefined {
    return this.isL1SafeMasterCopy
  }

  get safeContract1(): GnosisSafeContract {
    return this.safeContract
  }

  get multiSendContract1(): MultiSendContract {
    return this.multiSendContract
  }
}

export default ContractManager
