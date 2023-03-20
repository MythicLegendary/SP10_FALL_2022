import { useContext } from 'react';
import styled from 'styled-components';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  connectSnap,
  getSnap,
  sendSnapRPC,
  shouldDisplayReconnectButton,
} from '../utils';
import {
  ConnectButton,
  InstallFlaskButton,
  ReconnectButton,
  SubmitButton,
  Card
} from '../components';

import Tabs from "../components/Tabs"
import Tab from "../components/Tab"

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary.default};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const Notice = styled.div`
  background-color: ${({ theme }) => theme.colors.background.alternative};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  & > * {
    margin: 0;
  }
  ${({ theme }) => theme.mediaQueries.small} {
    margin-top: 1.2rem;
    padding: 1.6rem;
  }
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error.muted};
  border: 1px solid ${({ theme }) => theme.colors.error.default};
  color: ${({ theme }) => theme.colors.error.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);

  const handleConnectClick = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  return (
    <Container>
      <Heading>
        COSMOS SNAP <Span>DEV MODE</Span>
      </Heading>
      <Subtitle>
        Edit this site at <code>src/pages/index.tsx</code>
      </Subtitle>

      <Tabs>
        <Tab title="Setup">
          <CardContainer>
            {state.error && (
              <ErrorMessage>
                <b>An error happened:</b> {state.error.message}
              </ErrorMessage>
            )}
            {!state.isFlask && (
              <Card
                content={{
                  title: 'Install',
                  description:
                    'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
                  inputs: [],
                  rpcRequest: '',
                  button: <InstallFlaskButton />,
                }}
                disabled={false}
                fullWidth
              />
            )}
            {!state.installedSnap && (
              <Card
                content={{
                  title: 'Connect',
                  description:
                    'Get started by connecting to and installing the example snap.',
                  inputs: [],
                  rpcRequest: '',
                  button: (
                    <ConnectButton
                      onClick={handleConnectClick}
                      disabled={!state.isFlask}
                    />
                  ),
                }}
                disabled={!state.isFlask}
              />
            )}
            {shouldDisplayReconnectButton(state.installedSnap) && (
              <Card
                content={{
                  title: 'Reconnect',
                  description:
                    'While connected to a local running snap this button will always be displayed in order to update the snap if a change is made.',
                  inputs: [],
                  rpcRequest: '',
                  button: (
                    <ReconnectButton
                      onClick={handleConnectClick}
                      disabled={!state.installedSnap}
                    />
                  ),
                }}
                disabled={!state.installedSnap}
              />
            )}
            <Card
              content={{
                title: 'Login With Password',
                description:
                  'Enter Password To Unlock Other Functions',
                inputs: ["password"],
                rpcRequest: 'login'
              }}
              disabled={!state.installedSnap}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Setup Account',
                description:
                  'Enter mnemonic and a new password to setup or reset your account.',
                inputs: ["mnemonic", "password"],
                rpcRequest: 'setupPassword'
              }}
              disabled={!state.installedSnap}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
          </CardContainer>
        </Tab>

        <Tab title="Wallet and Network Information">
          <CardContainer>
            {state.error && (
              <ErrorMessage>
                <b>An error happened:</b> {state.error.message}
              </ErrorMessage>
            )}

            <Card
              content={{
                title: 'GET SNAP STATE',
                description:
                  '',
                inputs: [],
                rpcRequest: 'getSnapState'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />

            <Card
              content={{
                title: 'GET ACCOUNT INFO',
                description:
                  'Retrieve the balance of the default coin for your account.',
                inputs: [],
                rpcRequest: 'getAccountInfo'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />

            <Card
              content={{
                title: 'GET ACCOUNT GENERAL',
                description:
                  'Retrieve the balance of a partiuclar coin at a particular address.',
                inputs: ['denom', 'address'],
                rpcRequest: 'getAccountGeneral'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'GET REWARDS',
                description:
                  '',
                inputs: [],
                rpcRequest: 'getRewards'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
          </CardContainer>
        </Tab>

        <Tab title="Configurations">
          <CardContainer>
            <Card
              content={{
                title: 'SET SNAP CONFIG',
                description:
                  'Set the URL for the Cosmos Blockchain Host.',
                inputs: [
                  "nodeUrl",
                ],
                rpcRequest: 'setConfig'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'SET SNAP CONFIG',
                description:
                  'Set the default denom used for your account balance.',
                inputs: [
                  "denom",
                ],
                rpcRequest: 'setConfig'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'SET SNAP CONFIG',
                description:
                  'Set the parameters for formatting transaction fees.',
                inputs: [
                  "feeDenom",
                  "feeAmount"
                ],
                rpcRequest: 'setConfig'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'SET SNAP CONFIG',
                description:
                  'Set the gas for transactions',
                inputs: [
                  "gas",
                ],
                rpcRequest: 'setConfig'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'SET SNAP CONFIG',
                description:
                  'Set the memo and prefix.',
                inputs: [
                  "memo",
                  "prefix"
                ],
                rpcRequest: 'setConfig'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
          </CardContainer>
        </Tab>

        <Tab title="Transactions and Delegations">
          <CardContainer>
            <Card
              content={{
                title: 'CLEAR DATA',
                description:
                  'Clear all the configuration data.',
                inputs: [
                ],
                rpcRequest: 'clearWalletData'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Create Send',
                description:
                  '',
                inputs: ['recipientAddress', 'amount', 'denom', 'memo'],
                rpcRequest: 'createSend'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Create MultiSend',
                description:
                  'Enter transaction like such: <address>-<amount>-<denom> and separate with a single space',
                inputs: ['inputs', 'memo'],
                rpcRequest: 'createMultiSend'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Create Delegate',
                description:
                  '',
                inputs: ['to', 'amount'],
                rpcRequest: 'createDelegate'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Create Redelegate',
                description:
                  '',
                inputs: ['from', 'to', 'amount'],
                rpcRequest: 'createRedelegate'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Create Undelegate',
                description:
                  '',
                inputs: ['from', 'amount'],
                rpcRequest: 'createUndelegate'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Withdraw Delegation Reward',
                description:
                  '',
                inputs: ['rewards'],
                rpcRequest: 'withdrawDelegationReward'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
          </CardContainer>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Index;