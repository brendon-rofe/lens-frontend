import { ReactNode } from 'react';
import {
  Box,
  Flex,
  Avatar,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorModeValue,
  Stack,
  useColorMode,
  Center,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';

import { useState, useEffect } from 'react';
import { ethers, providers } from 'ethers';
import { createClient, STORAGE_KEY, authenticate as authenticateMutation, getChallenge, getDefaultProfile } from '../api';
import { parseJwt, refreshAuthToken } from '../utils';

export default function Navbar() {
  const { colorMode, toggleColorMode } = useColorMode();
  const [connected, setConnected] = useState(true)
  const [userAddress, setUserAddress] = useState()
  const [userProfile, setUserProfile] = useState()

  useEffect(() => {
    refreshAuthToken()
    async function checkConnection() {
      const provider = new ethers.providers.Web3Provider(
        (window).ethereum
      )
      const addresses = await provider.listAccounts();
      if (addresses.length) {
        setConnected(true)
        setUserAddress(addresses[0])
        getUserProfile(addresses[0])
      } else {
        setConnected(false)
      }
    }
    checkConnection()
  }, [])

  async function getUserProfile(address) {
    try {
      const urqlClient = await createClient()
      const response = await urqlClient.query(getDefaultProfile, {
        address
      }).toPromise()
      console.log({response})
      setUserProfile(response.data.defaultProfile)
    } catch (err) {
      console.log('error fetching user profile...: ', err)
    }
  }

  async function signIn() {
    try {
      const accounts = await window.ethereum.send(
        "eth_requestAccounts"
      )
      setConnected(true)
      const account = accounts.result[0]
      setUserAddress(account)
      const urqlClient = await createClient()
      const response = await urqlClient.query(getChallenge, {
        address: account
      }).toPromise()
      const provider = new providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner()
      const signature = await signer.signMessage(response.data.challenge.text)
      const authData = await urqlClient.mutation(authenticateMutation, {
        address: account, signature
      }).toPromise()
      const { accessToken, refreshToken } = authData.data.authenticate
      const accessTokenData = parseJwt(accessToken)
      getUserProfile(account)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        accessToken, refreshToken, exp: accessTokenData.exp
      }))
    } catch (err) {
      console.log('error: ', err)
    }
  }

  return (
    <>
      <Box bg={useColorModeValue('gray.100', 'gray.900')} px={4}>
        <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
          <Box>Logo</Box>

          <Flex alignItems={'center'}>
            <Stack direction={'row'} spacing={7}>
              <Button onClick={toggleColorMode}>
                {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              </Button>

              <Menu>
                <MenuButton
                  as={Button}
                  rounded={'full'}
                  variant={'link'}
                  cursor={'pointer'}
                  minW={0}>
                  <Avatar
                    size={'sm'}
                    src={'https://avatars.dicebear.com/api/male/username.svg'}
                  />
                </MenuButton>
                <MenuList alignItems={'center'}>
                  <br />
                  <Center>
                    <Avatar
                      size={'2xl'}
                      src={'https://avatars.dicebear.com/api/male/username.svg'}
                    />
                  </Center>
                  <br />
                  <Center>
                    <p>Username</p>
                  </Center>
                  <br />
                  <MenuDivider />
                  <MenuItem>Your Servers</MenuItem>
                  <MenuItem>Account Settings</MenuItem>
                  <MenuItem>Logout</MenuItem>
                </MenuList>
                <Button onClick={signIn}>Login</Button>
              </Menu>
            </Stack>
          </Flex>
        </Flex>
      </Box>
    </>
  );
}