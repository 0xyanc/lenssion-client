import { Flex, Image, Text } from "@chakra-ui/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const Header = () => {
  return (
    <Flex h="5vh" p="2rem" justifyContent="space-between" alignItems="center">
      <Image boxSize="80px" src="/logo.png" alt="Logo" />

      <ConnectButton showBalance={false} />
    </Flex>
  );
};

export default Header;
