import React, { ReactElement, useState } from "react"
import styled from 'styled-components';
import TabTitle from "./TabTitle"
import {Tabs as AntdTabs, Row, Col, Layout, Radio, ConfigProvider, RadioChangeEvent} from 'antd';
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

  const onTabSelect = (e: RadioChangeEvent) => {
    setSelectedTab(parseInt(e.target.value));
  };

  return (
    <Layout style={{backgroundColor: 'inherit'}}>
      <Row>
        <Col offset={4} span={16}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
            <ConfigProvider
              theme={{
                components: {
                  Radio: {
                    colorBgContainer: '#111',
                    colorText: '#bbb',
                    colorBorder: '#1c162c'
                  },
                },
              }}
            >
              <Radio.Group defaultValue="0" buttonStyle="solid" onChange={onTabSelect} style={{marginBottom: '10px'}}>
              {
                (
                  ()=>{
                    let inputs:any = [];
                    tabItems.map((tab,index) => {
                      inputs.push(
                        <Radio.Button value={tab.key}>{tab.label}</Radio.Button>
                      )
                    })
                    return inputs;
                  }
                )()
              }
                {/* <Radio.Button value="b">Shanghai</Radio.Button>
                <Radio.Button value="c">Beijing</Radio.Button>
                <Radio.Button value="d">Chengdu</Radio.Button> */}
              </Radio.Group>
            </ConfigProvider>
              {/* <AntdTabs
              defaultActiveKey="0"
              items={tabItems}
              onChange={onChange} 
              type='card'
              tabBarStyle={{border: 'none'}}
              animated={{ inkBar: false, tabPane: false }}
              /> */}
            </Col>
          </Row>
          {children[selectedTab]}
        </Col>
      </Row>
    </Layout>
  );
}

export default Tabs