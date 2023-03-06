import React, { ReactNode } from 'react';
import styled from 'styled-components';
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

export class Card extends React.Component<CardProps> {
  inputDivRef = React.createRef<HTMLInputElement>();

  gatherInputs() {
    let inputDiv = this.inputDivRef.current;
    let inputFields = inputDiv?.querySelectorAll('input');
    let res:any = {};

    if (inputFields==null) return res;

    for (let i = 0; i < inputFields.length; i++) {
      let input = inputFields[i];      
      res[input.id] = input.value;
    }
    
    return res;
  }

  render() {
    return (
      <CardWrapper fullWidth={this.props.fullWidth} disabled={this.props.disabled}>

      {this.props.content.title && (
        <Title>{this.props.content.title}</Title>
      )}

      <Description>{this.props.content.description}</Description>

      <div ref={this.inputDivRef}>
        {/* Display a list of input fields (it's messy but works :/ - blame Abhijay ) */
          (
            ()=>{
              let inputs = [];
              for(let i = 0; i < this.props.content.inputs.length; i++) {
                inputs.push(<input placeholder={this.props.content.inputs[i]} id={this.props.content.inputs[i]} key={i}></input>);
              }
              return inputs;
            }
          )()
        }
      </div>

      {
        this.props.content.button ? (this.props.content.button) : (
          <SubmitButton
            onClick={()=>{sendSnapRPC(this.props.content.rpcRequest, this.gatherInputs())}}
            disabled={this.props.disabled}
          />
        )
      }

    </CardWrapper>
    );
  }
}