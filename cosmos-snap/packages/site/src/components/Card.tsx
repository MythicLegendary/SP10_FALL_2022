import React, { FunctionComponent, ReactNode, useContext } from 'react';
import styled from 'styled-components';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {RecaptchaVerifier} from "firebase/auth"
import {auth} from "../utils"

import {
  sendSnapRPC
} from '../utils';
import {
  SubmitButton
} from '../components';

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

const CardWrapper = styled.div<{ fullWidth?: boolean; disabled: boolean }>`
  display: flex;
  flex-direction: column;
  width: ${({ fullWidth }) => (fullWidth ? '100%' : '250px')};
  background-color: ${({ theme }) => theme.colors.card.default};
  margin-top: 2.4rem;
  margin-bottom: 2.4rem;
  padding: 2.4rem;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radii.default};
  box-shadow: ${({ theme }) => theme.shadows.default};
  filter: opacity(${({ disabled }) => (disabled ? '.4' : '1')});
  align-self: stretch;
  ${({ theme }) => theme.mediaQueries.small} {
    width: 100%;
    margin-top: 1.2rem;
    margin-bottom: 1.2rem;
    padding: 1.6rem;
  }
`;

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
    <CardWrapper fullWidth={fullWidth} disabled={disabled}>

      {content.title && (
        <Title>{content.title}</Title>
      )}

      <Description>{content.description}</Description>
      <div id="recaptcha-container"></div>
      <div ref={inputDivRef}>
        {/* Display a list of input fields (it's messy but works :/ - blame Abhijay ) */
          (
            ()=>{
              let inputs = [];
              for(let i = 0; i < content.inputs.length; i++) {
                inputs.push(<input placeholder={content.inputs[i]} id={content.inputs[i]} key={i}></input>);
              }
              return inputs;
            }
          )()
        }
      </div>

      {
        content.button ? (content.button) : (
          <SubmitButton
            onClick={submitButtonClicked}
            disabled={disabled}
          />
        )
      }

    </CardWrapper>
  );
}