import React, { FunctionComponent, ReactNode, useContext } from 'react';
import styled from 'styled-components';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  sendSnapRPC
} from '../utils';
import {
  SubmitButton
} from '.';

import {
  Card as AntdCard,
  Col,
  Button, 
  Space,
  Typography,
  Input
} from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import './CardWrapper.css';

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
    let response = await sendSnapRPC(content.rpcRequest, gatherInputs());
        
    if (response==null) return;
    
    if (content.rpcRequest=='login') {
      dispatch({
        type: MetamaskActions.SetLogin,
        payload: response.loginSuccessful
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
      <AntdCard ref={inputDivRef} style={{backgroundColor: 'rgb(28 22 44 / 94%)', boxShadow: 'rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgb(225 225 225 / 13%) 0px 0px 0px 1px'}} bordered={false}>
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
                    iconRender={(visible) => (isSensitive ? (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />) : (null) )}
                    style={{backgroundColor: 'transparent'}}
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