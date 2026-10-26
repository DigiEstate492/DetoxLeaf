"use client";
import {useEffect,useRef} from 'react';
import {notify} from './commerce/client';
export default function FeedbackToast({saved,error,section}){const previous=useRef('');useEffect(()=>{const key=JSON.stringify([saved,error,section]);if(previous.current===key)return;previous.current=key;if(error)notify(error==='validation'?'Check your details and try again.':'Your changes could not be saved. Please try again.',{type:'error'});else if(saved)notify(section==='addresses'?'Your address changes are saved.':'Your account details are saved.');},[saved,error,section]);return null;}
