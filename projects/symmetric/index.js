const sdk = require('@defillama/sdk');
const BigNumber = require("bignumber.js");
const { GraphQLClient, gql } = require('graphql-request')
const { toUSDTBalances } = require('../helper/balances');
const { getBlock } = require('../helper/http');
async function getTVL(subgraphName, block, version = 'v1') {
  // delayed by around 5 mins to allow subgraph to update
  block -= 25;
  var endpoint = `https://api.thegraph.com/subgraphs/name/centfinance/${subgraphName}`
  var kavaEndPoint = 'https://subgraph.symmetric.exchange/subgraphs/name/centfinance/kava' 
  var graphQLClient = new GraphQLClient(endpoint)
  var graphQLClientKava = new GraphQLClient(kavaEndPoint)

  var v1 = gql`
  query get_tvl($block: Int) {
    symmetrics(
      first: 5,
      block: { number: $block }
    ) {
      totalLiquidity,
      totalSwapVolume
    }
  }
  `;
  var v2 = gql`
  query get_tvl($block: Int) {
    balancers(
      first: 5,
      block: { number: $block }
    ) {
      totalLiquidity,
      totalSwapVolume
    }
  }
  `;
  const results = subgraphName ==='kava' ? await graphQLClientKava.request(v2, {
    block
  }) : await graphQLClient.request(version === 'v1' ? v1 : v2, {
    block
  })
  return version ==='v1'? results.symmetrics[0].totalLiquidity : results.balancers[0].totalLiquidity;
}

async function xdai(timestamp, ethBlock, chainBlocks) {
  const [v1,v2] = await Promise.all([getTVL("symmetric-xdai", await getBlock(timestamp, "xdai", chainBlocks), 'v1'), getTVL("symmetric-v2-gnosis", await getBlock(timestamp, "xdai", chainBlocks), 'v2')])
  return toUSDTBalances(BigNumber(v1).plus(v2))
}

async function celo(timestamp, ethBlock, chainBlocks) {
  const [v1,v2] = await Promise.all([getTVL("symmetric-celo", await getBlock(timestamp, "celo", chainBlocks), 'v1'), getTVL("symmetric-v2-celo", await getBlock(timestamp, "celo", chainBlocks), 'v2')])
  return toUSDTBalances(BigNumber(v1).plus(v2))
}
async function kava(timestamp, ethBlock, chainBlocks) {
  const [v2] = await Promise.all([getTVL("kava", await getBlock(timestamp, "kava", chainBlocks), 'v2')])
  return toUSDTBalances(BigNumber(v2))
}

module.exports = {
  misrepresentedTokens: true,
  methodology: `Symmetric is an Automated Market Maker (AMM) and a Decentralized Exchange (DEX), running on the Celo, and Gnosis networks.
  Symmetric TVL is pulled from the Symmetric subgraph and includes deposits made to Symmetric Gnosis and Symmetric Celo V1 & V2 liquidity pools.`,
  celo:{
    tvl: celo
  },
  xdai:{
    tvl: xdai
  },
  kava:{
    tvl: kava
  }
}
