import type {Meta,StoryObj} from '@storybook/react-vite';
import {Example} from '../examples';
const meta={title:"Компоненты/Путешествие/BattleModeInfo",parameters:{componentName:"BattleModeInfo"}} satisfies Meta;
export default meta;
export const Preview:StoryObj<typeof meta>={name:'Пример',render:()=> <Example name="BattleModeInfo"/>};
