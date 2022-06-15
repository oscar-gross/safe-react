import { MasterCopyReponse, getMasterCopies } from '@gnosis.pm/safe-react-gateway-sdk'

import { _getChainId } from 'src/config'

export enum MasterCopyDeployer {
  GNOSIS = 'Gnosis',
  CIRCLES = 'Circles',
}

export type MasterCopy = MasterCopyReponse[number] & {
  deployer: MasterCopyDeployer
  deployerRepoUrl: string
}

const extractMasterCopyInfo = (mc: MasterCopyReponse[number]): MasterCopy => {
  const isCircles = mc.version.toLowerCase().includes(MasterCopyDeployer.CIRCLES.toLowerCase())
  const dashIndex = mc.version.indexOf('-')

  const masterCopy = {
    address: mc.address,
    version: !isCircles ? mc.version : mc.version.substring(0, dashIndex),
    deployer: !isCircles ? MasterCopyDeployer.GNOSIS : MasterCopyDeployer.CIRCLES,
    deployerRepoUrl: !isCircles
      ? 'https://github.com/gnosis/safe-contracts/releases'
      : 'https://github.com/CirclesUBI/safe-contracts/releases',
  }
  return masterCopy
}

export const fetchMasterCopies = async (): Promise<MasterCopy[] | undefined> => {
  try {
    const chainId = _getChainId()
    let res: MasterCopyReponse
    if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009) res = await getMasterCopies(chainId)

    res = [
      {
        address: '0xB14A20768097784cE478e9304F58873f84F6F451',
        version: '1.3.0+L2',
      },
      {
        address: '0x9c5ba02C7CCd1F11346E43785202711cE1DCc130',
        version: '1.2.0',
      },
      {
        address: '0x9c5ba02C7CCd1F11346E43785202711cE1DCc130',
        version: '1.3.0',
      },
      {
        address: '0x9c5ba02C7CCd1F11346E43785202711cE1DCc130',
        version: '1.1.1',
      },
    ]
    console.log('getMasterCopies', res)

    return res.map(extractMasterCopyInfo)
  } catch (error) {
    console.error('Fetching data from master-copies errored', error)
  }
}
