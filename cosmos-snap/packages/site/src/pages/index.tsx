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

  const InProgressBar = styled.div`
  border: 1px solid ${(props) => props.theme.colors.primary.default};
  color: ${(props) => props.theme.colors.primary.default};};
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
            {state.inProgress && (
              <InProgressBar>
                <b>Please Wait, Method In Progress:</b> {state.inProgressMethod}
              </InProgressBar>
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
                      disabled={!state.installedSnap || state.inProgress}
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
              disabled={!state.installedSnap || state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Setup Wallet',
                description:
                  'Stores your keys and configures a single factor login regime.',
                inputs: ["mnemonic", "password", "firstAccountName"],
                rpcRequest: 'setupPassword'
              }}
              disabled={!state.installedSnap || state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Enroll Phone Number For Authentication',
                description:
                  'For increased security use your phone number to authenticate yourself.',
                inputs: ["phoneNumber"],
                rpcRequest: 'enrollUserPhoneNumber'
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
                title: 'Reset Password',
                description:
                  'Restore the wallet and reset the password by entering a valid mnemonic for the stored wallet.',
                inputs: ["mnemonic", "password"],
                rpcRequest: 'restoreWallet'
              }}
              disabled={!state.installedSnap || state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Logout',
                description:
                  'Logout of the snap.',
                inputs: [],
                rpcRequest: 'logout'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
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
            {state.inProgress && (
              <InProgressBar>
                <b>Please Wait, Method In Progress:</b> {state.inProgressMethod}
              </InProgressBar>
            )}
            <Card
              content={{
                title: 'Get Account Information',
                description:
                  '',
                inputs: [],
                rpcRequest: 'getSnapState'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />

            <Card
              content={{
                title: 'Retrieve Account Balance',
                description:
                  'Retrieve the balance of the default coin for your account.',
                inputs: [],
                rpcRequest: 'getAccountInfo'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />

            <Card
              content={{
                title: 'Retrieve Another Account Balance',
                description:
                  'Retrieve the balance at a particular address.',
                inputs: ['address'],
                rpcRequest: 'getAccountGeneral'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'View Addresses',
                description:
                  'View the addresses saved',
                inputs: [],
                rpcRequest: 'viewAddresses'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
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
            {state.error && (
              <ErrorMessage>
                <b>An error happened:</b> {state.error.message}
              </ErrorMessage>
            )}            
            {state.inProgress && (
              <InProgressBar>
                <b>Please Wait, Method In Progress:</b> {state.inProgressMethod}
              </InProgressBar>
            )}
            <Card
              content={{
                title: 'Set Node URL',
                description:
                  'Set the URL for the Cosmos Blockchain Host.',
                inputs: [
                  "nodeUrl",
                ],
                rpcRequest: 'setConfig'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Set Default Denom',
                description:
                  'Set the default denom used for your account balance.',
                inputs: [
                  "denom",
                ],
                rpcRequest: 'setConfig'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Set Gas',
                description:
                  'Set as <amount><denom>.',
                inputs: [
                  "gas"
                ],
                rpcRequest: 'setConfig'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Add Addresses',
                description:
                  'Add user addresses to make sending transactions simpler.',
                inputs: [
                  "address",
                  "name"
                ],
                rpcRequest: 'addAddress'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
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
            {state.error && (
              <ErrorMessage>
                <b>An error happened:</b> {state.error.message}
              </ErrorMessage>
            )}            
            {state.inProgress && (
              <InProgressBar>
                <b>Please Wait, Method In Progress:</b> {state.inProgressMethod}
              </InProgressBar>
            )}
            <Card
              content={{
                title: 'Create Send',
                description:
                  '',
                inputs: ['recipientAddress', 'amount', 'memo'],
                rpcRequest: 'createSend'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
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
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'View Transaction History.',
                description:
                  '',
                inputs: [],
                rpcRequest: 'getTransactionHistory'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
      </CardContainer>
        </Tab>
        <Tab title="Data and Account Management.">
          <CardContainer>
            {state.error && (
              <ErrorMessage>
                <b>An error happened:</b> {state.error.message}
              </ErrorMessage>
            )}            
            {state.inProgress && (
              <InProgressBar>
                <b>Please Wait, Method In Progress:</b> {state.inProgressMethod}
              </InProgressBar>
            )}
            <Card
              content={{
                title: 'Add New Account',
                description:
                  'Adds a new account to the available accounts.',
                inputs: ['accountName', 'mnemonic'],
                rpcRequest: 'addNewAccount'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Set Active Account',
                description:
                  'Sets a different account to be the active account.',
                inputs: ['accountName'],
                rpcRequest: 'setActiveAccount'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'View Available Accounts',
                description:
                  'View the accounts that are available.',
                inputs: [],
                rpcRequest: 'viewAccounts'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Remove Account',
                description:
                  'Deletes all data, including keys of the specified account.',
                inputs: ['accountName'],
                rpcRequest: 'removeAccount'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
              fullWidth={
                state.isFlask &&
                Boolean(state.installedSnap) &&
                !shouldDisplayReconnectButton(state.installedSnap)
              }
            />
            <Card
              content={{
                title: 'Delete Wallet',
                description:
                  'Deletes all data, including all keys.',
                inputs: ['password'],
                rpcRequest: 'deleteWallet'
              }}
              disabled={!state.installedSnap || !state.isLoggedIn || state.inProgress}
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