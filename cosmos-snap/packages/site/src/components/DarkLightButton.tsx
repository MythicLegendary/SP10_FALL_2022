import { Button } from "antd";
import { useContext, useState } from "react";
import { PageThemeContext, ThemeContract } from "../utils/ThemeContract";

/*
    If the page theme is currently dark => we show light icon
    If the page theme is currently light => we show dark icon
 */
export const DarkLightButton = () => {
    const {theme, setTheme} = useContext(PageThemeContext);
    const darkIcon = '🌙';
    const lightIcon = '☀️';
    
    const onButtonPress = () => {
        setTheme(theme==ThemeContract.Dark ? ThemeContract.Light : ThemeContract.Dark);
    };

    return (
        <Button onClick={onButtonPress}>{theme==ThemeContract.Dark ? lightIcon : darkIcon}</Button>
    )
};
