import React, { ReactElement, useState } from "react"
import styled from 'styled-components';
import TabTitle from "./TabTitle"
import {Tabs as AntdTabs, Row, Col, Layout} from 'antd';
import type { TabsProps } from 'antd';
import { Header } from "antd/es/layout/layout";

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
    <Layout style={{backgroundColor: 'inherit'}}>
      <Row>
        <Col offset={4} span={16}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <AntdTabs
              defaultActiveKey="0"
              items={tabItems}
              onChange={onChange} 
              type='card'
              tabBarStyle={{border: 'none'}}
              />
            </Col>
          </Row>
          {children[selectedTab]}
        </Col>
      </Row>
    </Layout>
  );
}

export default Tabs