import Head from 'next/head'
import styles from '@/styles/Home.module.css'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button, Text } from '@chakra-ui/react'
import { useAccount, useContract, useProvider, useSigner } from 'wagmi'
import RegistryAbi from "../abi/IRegistry.json"
import AccountAbi from "../abi/Account.json"
import ERC712Abi from "../abi/ERC712.json"
import { useState, useEffect } from "react";
import { BigNumber, ethers } from 'ethers'
import { getAccount, prepareExecuteCall } from "@tokenbound/sdk-ethers";

import { UserOperationBuilder } from "userop";
import { Client } from "userop";
import { Presets } from "userop";


export default function Home() {
  const { address } = useAccount();
  const [smartAccount, setSmartAccount] = useState("")
  const [client, setClient] = useState(null)
  const [sessionNonce, setSessionNonce] = useState(0)
  const [signature, setSignature] = useState("")
  useEffect(() => {
    initClient()
  }, []);


  const LENS_HUB_ADDRESS = "0x60Ae865ee4C725cd04353b5AAb364553f56ceF82"
  const REGISTRY_ADDRESS = "0x02101dfb77fde026414827fdc604ddaf224f0921"
  const LENS_PROFILE_TOKEN = "0x60Ae865ee4C725cd04353b5AAb364553f56ceF82"
  const ACCOUNT_PROXY = "0xFEE9bd38AeABD513833e5691Bf1e62D371Be858b"
  // const ACCOUNT_IMPL = "0x160824A797074c96F2Fd71C5a74332D8326E6e68"
  const ACCOUNT_IMPL = "0xcFEa242d212cf086eF0a98A088c878C6079f9FBC"
  const CHAIN_ID = 80001

  const ENTRY_POINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
  // const BUNDLER_RPC = "https://api.stackup.sh/v1/node/cdfe0de4e20e67c8ab40cbd357c2d152fd707c26e7ff3e52dc2a8a8fefc32bca"
  const BUNDLER_RPC = "https://mumbai.voltaire.candidewallet.com/rpc"

  let provider = useProvider()
  let { data: signer } = useSigner()
  const writeRegistryContract = useContract({
    address: REGISTRY_ADDRESS,
    abi: RegistryAbi,
    signerOrProvider: signer,
  })
  const readRegistryContract = useContract({
    address: REGISTRY_ADDRESS,
    abi: RegistryAbi,
    signerOrProvider: provider,
  })

  const readAccountContract = useContract({
    address: ACCOUNT_PROXY,
    abi: AccountAbi,
    signerOrProvider: provider,
  })

  const readSmartAccountContract = useContract({
    address: smartAccount,
    abi: AccountAbi,
    signerOrProvider: provider,
  })

  const readERC712Contract = useContract({
    address: "0x557Ccde073d40D9c469788e7144013773d9563fa",
    abi: ERC712Abi,
    signerOrProvider: provider,
  })


  const initClient = async () => {
    const client = await Client.init(BUNDLER_RPC, ENTRY_POINT);
    setClient(client)
  }
  const getSessionNonce = async (account) => {
    // const readSmartAccountContract = useContract({
    //   address: account,
    //   abi: AccountAbi,
    //   signerOrProvider: provider,
    // })
  }
  // let builder = new UserOperationBuilder().useDefaults({ sender: smartAccount });
  let builder = new UserOperationBuilder().useDefaults({});

  const bundle = async () => {
    builder.setSender(smartAccount)
    const nonce = await getNonce(smartAccount)
    builder.setNonce(nonce)
    console.log(signature)
    builder.setSignature(signature)
    const to = "0x78f83b36468bFf785046974e21A1449b47FD7e74"; // my account address
    const value = ethers.utils.parseEther("0.01"); // amount of ETH to send
    const data = "0x"; // calldata
    const transactionData = await prepareExecuteCall(
      smartAccount,
      to,
      value,
      data
    );
    console.log(transactionData.data)
    builder.setCallData(transactionData.data)

    // provider is an ethers.js JSON-RPC provider.
    // BUG in stackup userop.js
    // builder = builder.useMiddleware(Presets.Middleware.estimateUserOperationGas(provider))
    // builder = builder.useMiddleware(Presets.Middleware.getGasPrice(provider))
    builder.setPreVerificationGas(BigNumber.from("300000"))
    builder.setVerificationGasLimit(BigNumber.from("300000"))
    builder.setCallGasLimit(BigNumber.from("300000"))
    builder.setMaxFeePerGas(ethers.utils.parseUnits("2", "gwei"))
    builder.setMaxPriorityFeePerGas(ethers.utils.parseUnits("2", "gwei"))
    // console.log(builder.getOp())


    // builder = builder.useMiddleware(
    //   Presets.Middleware.verifyingPaymaster(paymasterRpc, paymasterCtx)
    // )

    // const userOp = await client.buildUserOperation(builder);
    // console.log(userOp)
    // return
    // console.log(client)
    const response = await client.sendUserOperation(builder);
    const userOperationEvent = await response.wait();
    console.log(userOperationEvent)
  }

  const signNon712 = async () => {
    const sig = await signer.signMessage("submit UserOp")
    console.log(sig)
    setSignature(sig)
  }

  const sign = async () => {
    const signature = await signer._signTypedData(
      {
        name: "Lenssion",
        version: "1",
        chainId: 30001,
        verifyingContract: smartAccount,
        // verifyingContract: "0xFd70D1371a2bEF2faa8C3295f5393496E391643E"
      },
      {
        Session: [
          {
            name: "from",
            type: "address",
          },
          {
            name: "allowedFunctions",
            type: "string",
          },
          {
            name: "sessionNonce",
            type: "uint256",
          },
        ],
      },
      {
        from: address,
        allowedFunctions: "post,comment,mirror",
        sessionNonce: BigNumber.from(sessionNonce)
      }
    )
    console.log(signature)
    setSignature(signature)
  }

  const getNonce = async (account) => {
    const smartAccountInstance = new ethers.Contract(account, AccountAbi, provider)
    const nonce = await smartAccountInstance.getNonce()
    console.log(nonce)
    return nonce
  }


  const account = async () => {
    const address = await readRegistryContract.account(ACCOUNT_PROXY, CHAIN_ID, LENS_PROFILE_TOKEN, 30885, 123)
    getSessionNonce(address)
    setSmartAccount(address)
    return address
  }

  const createAccount = async () => {
    const address = await writeRegistryContract.createAccount(ACCOUNT_PROXY, CHAIN_ID, LENS_PROFILE_TOKEN, 30885, 123, 0x8129fc1c)
  }

  const send = async () => {
    console.log(smartAccount)
    const to = "0x78f83b36468bFf785046974e21A1449b47FD7e74"; // my account address
    const value = ethers.utils.parseEther("0.1"); // amount of ETH to send
    const data = "0x"; // calldata

    const transactionData = await prepareExecuteCall(
      smartAccount,
      to,
      value,
      data
    );

    // Execute encoded call
    const { hash } = await signer.sendTransaction(transactionData);
    console.log(hash)
  }

  const checkSig = async () => {

    const res = await readAccountContract.checkSig(signature)
    console(res)
  }
  const initialize = async (account) => {
    const accountInstance = new ethers.Contract(account, ["function initialize()"], signer)
    const tx = await accountInstance.initialize();
    console.log(tx)
    await tx.wait()
  }

  const owner = async () => {
    const accountInstance = new ethers.Contract(smartAccount, ["function owner()"], signer)
    const tx = await accountInstance.owner();
    console.log(tx)
    const res = await tx.wait()
    console.log(res)
  }

  const sig = async () => {
    console.log(signature)
    const res = await readERC712Contract.isValidSignature(ethers.constants.HashZero, signature)
    console.log(res)
  }
  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ConnectButton />
      <Button colorScheme="green" onClick={() => account()}>Get Account</Button>
      <Text>Address is {smartAccount}</Text>
      <Button colorScheme="green" onClick={() => createAccount()}>Create Account</Button>
      {/* <Button colorScheme="green" onClick={() => initialize(smartAccount)}>Init</Button> */}
      <Button colorScheme='blue' onClick={() => send()}>Send</Button>
      <Button colorScheme='blue' onClick={() => bundle()}>Bundle</Button>
      <Button colorScheme='red' onClick={() => signNon712()}>Sign</Button>
      <Button colorScheme='purple' onClick={() => checkSig()}>Check sig</Button>
      <Button colorScheme='purple' onClick={() => sign()}>Sign 712</Button>
      <Button colorScheme='blue' onClick={() => sig()}>sig</Button>
    </>
  )
}
