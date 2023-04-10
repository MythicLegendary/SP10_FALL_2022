import { FunctionComponent, ReactNode, useContext } from 'react';
import styled from 'styled-components';
import { SearchOutlined } from '@ant-design/icons';

import { GlobalStyle } from './config/theme';
import { ToggleThemeContext } from './Root';

import {Button, Layout, theme as AntdTheme} from 'antd';
const { Header, Footer, Sider, Content } = Layout;

import lightLogo from './assets/cosmos-high-res.png';
import darkLogo from './assets/cosmos-high-res-dark.png'

import {Col, Row} from 'antd';

import { Toggle } from './components/Toggle';
import { HeaderButtons } from './components/Buttons';
import { MetamaskActions, MetaMaskContext } from './hooks';
import { connectSnap, getThemePreference, getSnap } from './utils';
import { DarkLightButton } from './components/DarkLightButton';
import { PageThemeContext, ThemeContract } from './utils/ThemeContract';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  max-width: 100vw;
`;

export type AppProps = {
  children: ReactNode;
};

export const App: FunctionComponent<AppProps> = ({ children }) => {

  const {theme, setTheme} = useContext(PageThemeContext);

  const toggleTheme = useContext(ToggleThemeContext);
  const {
    token: { colorBgContainer },
  } = AntdTheme.useToken();
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
    <>
      <GlobalStyle />
      <Layout style={{background: colorBgContainer}} >
        <Row style={{marginBottom: '20px', marginTop: '20px'}}>
          <Col offset={6} span={12}>
            <img src={theme==ThemeContract.Dark?darkLogo:lightLogo} style={{maxWidth: '100%', maxHeight: '100%'}}></img>
          </Col>
          <Col offset={1} span={1}>
            <HeaderButtons state={state} onConnectClick={handleConnectClick} />
          </Col>

          <Col offset={1} span={1}>
            <DarkLightButton/>
          </Col>
        </Row>
        <Content style={{background: colorBgContainer}}>
          {children}
        </Content>
      </Layout>
      {/* <Wrapper>
        <Header handleToggleClick={toggleTheme} />
        {children}
        <Footer />
      </Wrapper> */}
    </>
  );
};
