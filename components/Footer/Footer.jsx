import { Flex, Text } from "@chakra-ui/react";

const Footer = () => {
  return (
    <Flex h="5vh" p="2rem" justifyContent="center" alignItems="center">
      <Text>&copy; LensSion @ EthGlobal Lisbon {new Date().getFullYear()}</Text>
    </Flex>
  );
};

export default Footer;
