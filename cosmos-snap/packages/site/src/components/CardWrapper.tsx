import React, { FunctionComponent, ReactNode, useContext } from 'react';
import styled from 'styled-components';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  sendSnapRPC
} from '../utils';
import {
  SubmitButton
} from '.';
import {RecaptchaVerifier} from "firebase/auth"
import {auth} from "../utils"

import {
  Card as AntdCard,
  Col,
  Button, 
  Space,
  Typography,
  Input
} from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone, EyeOutlined } from '@ant-design/icons';
import { PageThemeContext, ThemeContract } from '../utils/ThemeContract';

type CardProps = {
  content: {
    title?: string;
    description: ReactNode;
    inputs: string[];
    rpcRequest: string;
    button?: ReactNode;
  };
  disabled: boolean;
  fullWidth?: boolean;
};

export const Card: FunctionComponent<CardProps> = ({content, disabled, fullWidth}) => {
  const inputDivRef = React.createRef<HTMLInputElement>();
  const [state, dispatch] = useContext(MetaMaskContext);
  const {theme, setTheme} = useContext(PageThemeContext);

  const gatherInputs = () => {
    let inputDiv = inputDivRef.current;
    let inputFields = inputDiv?.querySelectorAll('input');
    let res:any = {};

    if (inputFields==null) return res;

    for (let i = 0; i < inputFields.length; i++) {
      let input = inputFields[i];      
      res[input.id] = input.value;
    }

    return res;
  }

  const submitButtonClicked = async () => {
    // Generate a Recaptcha For MFA
    const container = document.createElement('div');
    container.id = 'recaptcha-container';
    document.body.appendChild(container);
    const recaptchaVerifier= new RecaptchaVerifier(container, {
      size: "invisible",
      callback: (response: any) => {
        console.log("reCaptcha Solved!");
      },
      "expired-callback": () => {
        console.log("reCaptcha Expired. Please try again.");
        // Display an error message to the user or retry the reCAPTCHA verification
      },
      "error-callback": () => {
        console.log("reCaptcha Error. Please try again.");
        // Display an error message to the user or retry the reCAPTCHA verification
      },
    }, auth);

    // Submit In Progress
    dispatch({
      type: MetamaskActions.SetInProgress,
      payload: true
    });
    dispatch({
      type: MetamaskActions.SetInProgressMethod,
      payload: content.rpcRequest
    });


    // If not a login or setupPassword call, pass the UID
    const inputs : any = gatherInputs();
    if(content.rpcRequest != 'login' && content.rpcRequest != 'setupPassword') {
      inputs.uid = state.uid
    }

    // Send the request
    let response = await sendSnapRPC(content.rpcRequest, 
      inputs, 
      recaptchaVerifier
    );
    
    // Submit Not In Progress
    dispatch({
      type: MetamaskActions.SetInProgress,
      payload: false
    });
    dispatch({
      type: MetamaskActions.SetInProgressMethod,
      payload: ""
    });
    if (response==null) return;
    
    if (content.rpcRequest=='login') {
      dispatch({
        type: MetamaskActions.SetLogin,
        payload: response.loginSuccessful
      });
    }
    // if login_successful, then set UID
    if(response.loginSuccessful && content.rpcRequest == 'login') {
      dispatch({
        type: MetamaskActions.SetUID,
        payload: response.uid
      });
    }
    if (content.rpcRequest=='deleteWallet') {
      dispatch({
        type: MetamaskActions.SetLogin,
        payload: !response.deleted
      });
    }
    if(content.rpcRequest == 'logout') {
      dispatch({
        type: MetamaskActions.SetLogin,
        payload: false
      });
    }
  }

  return (
    <Col span={24}>
      <AntdCard ref={inputDivRef} bordered={theme==ThemeContract.Dark?false:true}>
        <Space direction="vertical" size="small">
          <AntdCard.Meta description={content.description} title={content.title}/>
          {
            (
              ()=>{
                let inputs = [];
                for(let i = 0; i < content.inputs.length; i++) {
                  let input = content.inputs[i];
                  let inputPlaceholder = input.match(':') ? input.split(':')[0] : input;
                  let inputType = input.match(':') ? input.split(':')[1] : null;
                  let isSensitive = inputType==='sensitive';
                  inputs.push(
                  <Input.Password
                    visibilityToggle={({visible:!isSensitive})}
                    placeholder={inputPlaceholder}
                    id={inputPlaceholder}
                    key={i}
                    iconRender={(visible) => (isSensitive ? (visible ? <EyeOutlined style={{color: '#bbb'}}/> : <EyeInvisibleOutlined style={{color: '#bbb'}}  />) : (null) )}
                  />
                  );
                }
                return inputs;
              }
            )()
          }
          {
            content.button ? (content.button) : (
            <Button disabled={disabled} onClick={submitButtonClicked}>Submit</Button>
            )
          }
        </Space>
      </AntdCard>
    </Col>
  );
}