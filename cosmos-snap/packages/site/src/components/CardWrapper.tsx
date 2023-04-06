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

// const CardWrapper = styled.div<{ fullWidth?: boolean; disabled: boolean }>`
//   display: flex;
//   flex-direction: column;
//   width: ${({ fullWidth }) => (fullWidth ? '100%' : '250px')};
//   background-color: ${({ theme }) => theme.colors.card.default};
//   margin-top: 2.4rem;
//   margin-bottom: 2.4rem;
//   padding: 2.4rem;
//   border: 1px solid ${({ theme }) => theme.colors.border.default};
//   border-radius: ${({ theme }) => theme.radii.default};
//   box-shadow: ${({ theme }) => theme.shadows.default};
//   filter: opacity(${({ disabled }) => (disabled ? '.4' : '1')});
//   align-self: stretch;
//   ${({ theme }) => theme.mediaQueries.small} {
//     width: 100%;
//     margin-top: 1.2rem;
//     margin-bottom: 1.2rem;
//     padding: 1.6rem;
//   }
// `;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.large};
  margin: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const Description = styled.div`
  margin-top: 5px;
  margin-bottom: 5px;
`;

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
    <Col span={16} offset={4}>
      <AntdCard ref={inputDivRef}>
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