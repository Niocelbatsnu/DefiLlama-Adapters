const sdk = require('@defillama/sdk')
const { getConfig } = require('../helper/cache')

const abi = require('./abi.json');
const BigNumber = require('bignumber.js')

const addressAPI = "https://analytics.back.popsicle.finance/api/v1/FragolaApy"

async function tvl(timestamp, ethBlock) {
  const addresses = (await getConfig('sorbetto', addressAPI)).map(t => t.fragolaAddress)
  console.log(addresses, addresses.length)
  const balances = {}
  const [token0, token1, token0PerShareStored, token1PerShareStored, totalSupply] = await Promise.all(
    ["token0", "token1", "token0PerShareStored", "token1PerShareStored"]
      .map(method => abi[method]).concat(['erc20:totalSupply']).map(abi => sdk.api.abi.multiCall({
        abi,
        calls: addresses.map(a => ({ target: a })),
        block: ethBlock
      }))
  )
  for (let i = 0; i < addresses.length; i++) {
    sdk.util.sumSingleBalance(balances, token0.output[i].output, BigNumber(token0PerShareStored.output[i].output).times(totalSupply.output[i].output).div(1e18).toFixed(0))
    sdk.util.sumSingleBalance(balances, token1.output[i].output, BigNumber(token1PerShareStored.output[i].output).times(totalSupply.output[i].output).div(1e18).toFixed(0))
  }
  return balances
}

module.exports = {
  ethereum: {
    tvl
  },
}