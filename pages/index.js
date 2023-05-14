import Head from 'next/head'
import styles from '@/styles/Home.module.css'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Box, Button, Flex, Image, Input, Text } from '@chakra-ui/react'
import { useAccount, useContract, useProvider, useSigner } from 'wagmi'
import RegistryAbi from "../abi/IRegistry.json"
import AccountAbi from "../abi/Account.json"
import ERC712Abi from "../abi/ERC712.json"
import EntryPointAbi from "../abi/EntryPoint.json"
import LensHubAbi from "../abi/LensHub.json"
import AbstractBallAbi from "../abi/AbstractBall.json"
import { useState, useEffect } from "react";
import { BigNumber, ethers } from 'ethers'
import { getAccount, prepareExecuteCall } from "@tokenbound/sdk-ethers";

import { UserOperationBuilder } from "userop";
import { Client } from "userop";
import { Presets } from "userop";
import { Interface } from 'ethers/lib/utils.js'


export default function Home() {
  const { address, isConnected } = useAccount();
  const [smartAccount, setSmartAccount] = useState("")
  const [client, setClient] = useState(null)
  const [sessionNonce, setSessionNonce] = useState(0)
  const [signature, setSignature] = useState("")
  const [pfpUrl, setPfpUrl] = useState("")
  const [handle, setHandle] = useState("")
  const [accountCreated, setAccountCreated] = useState(false)
  const [tokenId, setTokenId] = useState(0)
  useEffect(() => {
    if (isConnected) {
      initClient()
      fetchLensNFT()
      account()
    }
  }, [address, isConnected]);


  const LENS_HUB_ADDRESS = "0x60Ae865ee4C725cd04353b5AAb364553f56ceF82"
  const REGISTRY_ADDRESS = "0x02101dfb77fde026414827fdc604ddaf224f0921"
  const LENS_PROFILE_TOKEN = "0x60Ae865ee4C725cd04353b5AAb364553f56ceF82"
  const ACCOUNT_PROXY = "0x955303d4d6e30D8844862A8b070c5f83561f5Ff7"
  // const ACCOUNT_IMPL = "0x160824A797074c96F2Fd71C5a74332D8326E6e68"
  const ACCOUNT_IMPL = "0x269BE277E5bd92aAbE4A194692D0737C15232823"
  const CHAIN_ID = 80001

  const ENTRY_POINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
  const BUNDLER_RPC = "https://api.stackup.sh/v1/node/cdfe0de4e20e67c8ab40cbd357c2d152fd707c26e7ff3e52dc2a8a8fefc32bca"
  // const BUNDLER_RPC = "https://mumbai.voltaire.candidewallet.com/rpc"

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

  const readEntryPointContract = useContract({
    address: ENTRY_POINT,
    abi: EntryPointAbi,
    signerOrProvider: provider,
  })

  const readLensHubContract = useContract({
    address: LENS_HUB_ADDRESS,
    abi: LensHubAbi,
    signerOrProvider: provider,
  })

  const writeAbstractBall = useContract({
    address: "0x4bc61e9608e07225bc704da29a5fe9f2976534e8",
    abi: AbstractBallAbi,
    signerOrProvider: signer,
  })

  const initClient = async () => {
    const client = await Client.init(BUNDLER_RPC, ENTRY_POINT);
    setClient(client)
  }

  const fetchLensNFT = async () => {
    const [, , , handle, pfp, metadata] = await readLensHubContract.getProfile(30885)
    const pfpUrl = pfp.replace('ipfs://', 'https://ipfs.io/ipfs/')
    console.log(pfpUrl);
    setPfpUrl(pfpUrl)
    setHandle(handle)

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
    // console.log(signature)
    // builder.setSignature(signature)
    const to = "0x78f83b36468bFf785046974e21A1449b47FD7e74"; // my account address
    const value = ethers.utils.parseEther("0.01"); // amount of ETH to send
    const data = "0x"; // calldata
    const transactionData = await prepareExecuteCall(
      smartAccount,
      to,
      value,
      data
    );
    builder.setCallData(transactionData.data)

    // provider is an ethers.js JSON-RPC provider.
    // BUG in stackup userop.js
    // builder = builder.useMiddleware(Presets.Middleware.estimateUserOperationGas(provider))
    // builder = builder.useMiddleware(Presets.Middleware.getGasPrice(provider))
    builder.setPreVerificationGas("90000")
    builder.setVerificationGasLimit("90000")
    builder.setCallGasLimit("90000")
    builder.setMaxFeePerGas(ethers.utils.parseUnits("2", "gwei"))
    builder.setMaxPriorityFeePerGas(ethers.utils.parseUnits("2", "gwei"))
    // console.log(builder.getOp())


    // builder = builder.useMiddleware(
    //   Presets.Middleware.verifyingPaymaster(paymasterRpc, paymasterCtx)
    // )



    // const userOp = await client.buildUserOperation(builder);
    console.log("userop", builder.getOp())
    const hash = await getUserOpHash(builder.getOp())
    const userOpSignature = await signer.signMessage(hash)
    console.log("raw signature", userOpSignature)
    builder.setSignature(userOpSignature)
    console.log(builder.getOp())

    const recoveredSigner = ethers.utils.verifyMessage(hash, userOpSignature);
    console.log(recoveredSigner)

    const response = await client.sendUserOperation(builder);
    console.log("response", response)
    const userOperationEvent = await response.wait();
    console.log("userOpEvent", userOperationEvent)
  }

  const getUserOpHash = async (userOp) => {
    const hash = await readEntryPointContract.getUserOpHash(userOp)
    console.log("hash", hash)
    return hash
  }

  const signNon712 = async () => {
    const hash = ethers.utils.id("submit UserOp")
    const sig = await signer.signMessage(hash)
    const recoveredSigner = ethers.utils.verifyMessage(hash, sig);
    console.log(recoveredSigner)
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
    const code = await provider.getCode(address);
    if (code !== '0x') return setAccountCreated(true);
    return address
  }

  const createAccount = async () => {
    const address = await writeRegistryContract.createAccount(ACCOUNT_PROXY, CHAIN_ID, LENS_PROFILE_TOKEN, 30885, 123, 0x8129fc1c)
  }

  const approveNft = async (tokenId) => {
    // approval
    const iface = new Interface(AbstractBallAbi)
    const to = "0x4bc61e9608e07225bc704da29a5fe9f2976534e8"; // abstract ball
    const value = ethers.utils.parseEther("0"); // amount of ETH to send
    const dataApprove = iface.encodeFunctionData("approve", [address, tokenId]); // calldata
    const transactionDataApprove = await prepareExecuteCall(
      smartAccount,
      to,
      value,
      dataApprove
    );
    // Execute encoded call
    const { hashApprove } = await signer.sendTransaction(transactionDataApprove);
  }

  const transferNft = async (tokenId) => {
    // transfer NFT
    const iface = new Interface(AbstractBallAbi)
    const to = "0x4bc61e9608e07225bc704da29a5fe9f2976534e8"; // abstract ball
    const value = ethers.utils.parseEther("0"); // amount of ETH to send
    const dataSend = iface.encodeFunctionData("transferFrom", [smartAccount, address, tokenId]); // calldata
    const transactionDataSend = await prepareExecuteCall(
      smartAccount,
      to,
      value,
      dataSend
    );
    const { hashSend } = await signer.sendTransaction(transactionDataSend);
  }

  // const send = async () => {
  //   console.log(smartAccount)
  //   const to = "0x78f83b36468bFf785046974e21A1449b47FD7e74"; // my account address
  //   const value = ethers.utils.parseEther("0.1"); // amount of ETH to send
  //   const data = "0x"; // calldata

  //   const transactionData = await prepareExecuteCall(
  //     smartAccount,
  //     to,
  //     value,
  //     data
  //   );

  //   // Execute encoded call
  //   const { hash } = await signer.sendTransaction(transactionData);
  //   console.log(hash)
  // }

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
      <Flex>
        <Flex direction="column">
          <Box boxSize='sm'>
            <Text as="b">{handle}</Text>
            <Image src={pfpUrl} alt='Profile' />
            <Text><Text as="u">Smart Account Address: </Text>{smartAccount}</Text>
            {!accountCreated && <Button colorScheme="green" onClick={() => createAccount()}>Create Account</Button>}
          </Box>
        </Flex>
        <Flex direction="column" ml="2rem">
          <Text as="b">AbstractBall NFT</Text>
          <Input mt="0.5rem"
            placeholder={"tokenId"}
            value={tokenId}
            onChange={(e) => {
              setTokenId(e.target.value);
            }}></Input>
          <Button mt="0.5rem" colorScheme='blue' onClick={() => approveNft(tokenId)}>Approve NFT</Button>
          <Button mt="0.5rem" colorScheme='blue' onClick={() => transferNft(tokenId)}>Transfer NFT back</Button>
        </Flex>
        <Flex direction="column" ml="2rem">
          <Text as="b">Account Abstraction</Text>
          <Button mt="0.5rem" colorScheme='purple' onClick={() => sign()}>Start Session</Button>
          <Button mt="0.5rem" colorScheme='green' onClick={() => bundle()}>Post</Button>
          <Button mt="0.5rem" colorScheme='green' onClick={() => bundle()}>Comment</Button>
          <Button mt="0.5rem" colorScheme='green' onClick={() => bundle()}>Mirror</Button>
          <Button mt="0.5rem" colorScheme='purple'>End Session</Button>
        </Flex>
      </Flex >
    </>
  )
}
