import {
  VStack,
  Button,
  Text,
  HStack,
  Box
} from '@chakra-ui/react'
import {
  DialogBody,
  DialogContent,
  DialogRoot,
  DialogBackdrop
} from '@chakra-ui/react'
import { useConnectWallet, useWallets } from '@mysten/dapp-kit'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const wallets = useWallets()
  const { mutate: connectWallet } = useConnectWallet()

  const handleConnect = (walletName: string) => {
    const wallet = wallets.find(w => w.name === walletName)
    if (wallet) {
      connectWallet(
        { wallet },
        {
          onSuccess: () => {
            console.log(`Connected to ${walletName}`)
            onClose()
          },
          onError: (error) => {
            console.error(`Failed to connect to ${walletName}:`, error)
          }
        }
      )
    }
  }

  return (
    <DialogRoot open={isOpen} onOpenChange={({ open }) => !open && onClose()} placement="center">
      <DialogBackdrop />
      <DialogContent
        w="370px"
        maxW="90vw"
        borderRadius="12px"
        p="24px"
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        zIndex={1500}
        bg="white"
      >
        <DialogBody p={0}>
          <VStack gap="28px">
            <Text fontWeight="bold" fontSize="lg" textAlign="center">
              Connect your wallet
            </Text>

            <VStack gap={3} w="100%">
              {wallets.map((wallet) => (
                <Button
                  key={wallet.name}
                  w="100%"
                  h="60px"
                  bg="white"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="8px"
                  justifyContent="space-between"
                  p={4}
                  _hover={{
                    bg: "gray.50",
                    borderColor: "gray.300"
                  }}
                  onClick={() => handleConnect(wallet.name)}
                >
                  <HStack gap={3}>
                    <Box fontSize="24px">
                      <img src={wallet.icon} alt={wallet.name} width={24} height={24} />
                    </Box>
                    <Text fontWeight="medium" color="black">
                      {wallet.name}
                    </Text>
                  </HStack>

                  {/*<Text fontSize="sm" color="gray.500">*/}
                  {/*  {wallet.features?.includes('sui:standard') ? 'Available' : ''}*/}
                  {/*</Text>*/}
                </Button>
              ))}
            </VStack>
          </VStack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  )
}