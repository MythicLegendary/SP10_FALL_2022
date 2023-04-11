import { FunctionComponent, ReactNode, useContext } from 'react';
import styled, { css } from 'styled-components';
import { SearchOutlined } from '@ant-design/icons';

import { GlobalStyle } from './config/theme';
import { ToggleThemeContext } from './Root';

import {Button, Layout, theme as AntdTheme} from 'antd';
const { Header, Footer, Sider, Content } = Layout;

import lightLogo from './assets/cosmos-high-res.png';
import darkLogo from './assets/cosmos-high-res-dark.png';

import {Col, Row} from 'antd';

import { Toggle } from './components/Toggle';
import { HeaderButtons } from './components/Buttons';
import { MetamaskActions, MetaMaskContext } from './hooks';
import { connectSnap, getThemePreference, getSnap } from './utils';
import { DarkLightButton } from './components/DarkLightButton';
import { PageThemeContext, ThemeContract } from './utils/ThemeContract';

export type AppProps = {
  children: ReactNode;
};

const Wrapper = styled.div`
  ${(props) => {
    switch (props.$mode) {
      case "dark": {
        return css`
          div.ant-card-meta-description {
          color: #bbb !important;
          }
          div.ant-card-meta-title {
              color: #fff !important;
          }
          
          input {
              background-color: transparent !important;
              color: #bbb !important;
          }
          
          input::placeholder {
              color: #4e3d7c !important;
          }
          
          .ant-input-password {
              box-shadow: none !important;
              background-color: transparent !important;
              border-color: #4e3d7c !important;
          }
          
          .ant-btn {
              background-color: #000 !important;
              color: #bbb !important;
              border-color: transparent !important;
              font-weight: bold !important;
          }
          
          .ant-btn:hover {
              background-color: transparent !important;
              border-color: #4e3d7c !important;
          }
          .ant-radio-button-wrapper:hover {
          color: #fff !important;
          }
          
          .ant-radio-button-wrapper-checked {
          color: #fff !important;
          background-color: rgba(28, 22, 44, 0.94) !important;
          border-color: #4e3d7c !important;
          }
          
          .ant-radio-button-wrapper-checked::before {
          background-color: #4e3d7c !important;
          }
          
          .ant-row::-webkit-scrollbar-thumb {
              background-color: #222 !important;
              border-radius: 16px !important;
          }
          .ant-row::-webkit-scrollbar {
              background-color: transparent !important;
          }
          
          .ant-row::-webkit-scrollbar {
              width: 10px;
          }

          .ant-card {
            background-color: rgb(28 22 44 / 94%);
            box-shadow: rgba(0, 0, 0, 0.05) 0px 6px 24px 0px;
          }
        `;
      }

      case "light": {
        return css`
          .ant-radio-button-wrapper-checked {
            color: #fff !important;
            background-color: #000 !important;
            border-color: #000 !important;
          }

          .ant-radio-button-wrapper-checked::before {
            background-color: #000 !important;
            }

          .ant-radio-button-wrapper {
            background-color: #fff;
            color: #555;
          }

          .ant-radio-button-wrapper:hover {
            color: #000;
          }

          .ant-row::-webkit-scrollbar {
              background-color: transparent !important;
          }
          
          .ant-row::-webkit-scrollbar {
              width: 10px;
          }

          .ant-row::-webkit-scrollbar-thumb {
              background-color: #555 !important;
              border-radius: 16px !important;
          }
        `;
      }
    }
  }}
  
`;

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
      {/* <GlobalStyle /> */}
      <Wrapper $mode={theme==ThemeContract.Dark?'dark':'light'}>
      <Layout style={{background: colorBgContainer}}>
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
      </Wrapper>
      {/* <Wrapper>
        <Header handleToggleClick={toggleTheme} />
        {children}
        <Footer />
      </Wrapper> */}
    </>
  );
};
