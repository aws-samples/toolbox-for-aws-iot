/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as React from 'react';
import {useState} from 'react';
import {SideNavigationProps} from '@cloudscape-design/components/side-navigation';
import {SideNavigation} from "@cloudscape-design/components";
import {useNavigate} from "react-router";
import { useLocation } from 'react-router-dom';

const navHeader = {text: 'Menu', href: ''};
const navItems: SideNavigationProps['items'] = [
    {type: 'link', text: 'Test IoT SQL Statement', href: '/'},
    {type: 'link', text: 'Record MQTT Messages', href: '/record'},
    {type: 'link', text: 'Replay MQTT Messages', href: '/replay'},

];

const defaultOnFollowHandler: SideNavigationProps['onFollow'] = event => {
    // keep the locked href for our demo pages
    event.preventDefault();
};

interface NavigationProps {
    activeHref?: string;
    header?: SideNavigationProps['header'];
    items?: SideNavigationProps['items'];
    onFollowHandler?: SideNavigationProps['onFollow'];
}

export function Navigation({
                               activeHref,
                               header = navHeader,
                               items = navItems,
                               onFollowHandler = defaultOnFollowHandler,
                           }: NavigationProps) {
    return <SideNavigation items={items} header={header} activeHref={activeHref} onFollow={onFollowHandler}/>;
}

export function DashboardSideNavigation()  {
    const [activeHref, setActiveHref] = useState(useLocation().pathname)
    const navigate = useNavigate()
    const onFollowHandler: SideNavigationProps['onFollow'] = event => {
        event.preventDefault();
        setActiveHref(event.detail.href)
        navigate(event.detail.href)    
    };

    return (
        <>
            <Navigation items={navItems} activeHref={activeHref} onFollowHandler={onFollowHandler}/>

        </>
    );
}


