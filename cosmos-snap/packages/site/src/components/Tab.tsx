import React from 'react';
import {Row} from 'antd';

type Props = {
  title: string
  children: React.ReactNode;
}

const Tab: React.FC<Props> = ({ children }) => {
  return (
    <Row gutter={[16, 16]} style={{maxHeight: '70vh', overflowY: 'scroll', opacity: .97, paddingTop: '5px'}}>
      {children}
    </Row>
  );
}

export default Tab