import React from 'react';
import {Row} from 'antd';

type Props = {
  title: string
  children: React.ReactNode;
}

const Tab: React.FC<Props> = ({ children }) => {
  return (
    <Row gutter={[16, 16]}>
      {children}
    </Row>
  );
}

export default Tab