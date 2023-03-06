import React from "react"
import styled from 'styled-components';

type Props = {
  title: string
  index: number
  setSelectedTab: (index: number) => void
}

const TabTitleWrapper = styled.li`
    display: inline-block;
    list-style: none;
    margin-bottom: -1px;
    padding: 0.5rem 0.75rem;
`;

const TabTitle: React.FC<Props> = ({ title, setSelectedTab, index }) => {

  return (
    <TabTitleWrapper>
      <button onClick={() => setSelectedTab(index)}>{title}</button>
    </TabTitleWrapper>
  )
}

export default TabTitle