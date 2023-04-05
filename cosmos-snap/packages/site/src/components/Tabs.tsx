import React, { ReactElement, useState } from "react"
import styled from 'styled-components';
import TabTitle from "./TabTitle"
import {Tabs as AntdTabs, Row, Col} from 'antd';
import type { TabsProps } from 'antd';

type Props = {
  children: ReactElement[]
}

const Tabs: React.FC<Props> = ({ children }) => {
  const [selectedTab, setSelectedTab] = useState(0);

  const tabItems: TabsProps['items'] = [];
  children.map((item,index) => {
    tabItems.push({
      key: index.toString(),
      label: item.props.title
    });
  });

  const onChange = (key: string) => {
    setSelectedTab(parseInt(key));
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col offset={4} span={16}>
          <AntdTabs defaultActiveKey="0" items={tabItems} onChange={onChange}/>
        </Col>
      </Row>
      {children[selectedTab]}
    </div>
  );
}

export default Tabs