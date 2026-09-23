import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@kankor/config";
import { AppButton } from "../../components/app-button";
import { FormField } from "../../components/form-field";
import { Screen } from "../../components/screen";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

export default function RecoveryScreen(){
  const {requestRecovery}=useAuth(); const {direction,text}=useLocale();
  const [email,setEmail]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  const align=direction==="rtl"?"right":"left";
  async function submit(){setBusy(true);setMessage("");try{const r=await requestRecovery(email);setMessage(r.developmentToken?`${text.recoveryAccepted}\n${text.resetToken}: ${r.developmentToken}`:text.recoveryAccepted);}catch{setMessage(text.genericError);}finally{setBusy(false);}}
  return <Screen><View style={styles.stack}>
    <Text style={[styles.title,{textAlign:align,writingDirection:direction}]}>{text.recoveryTitle}</Text>
    <Text style={[styles.body,{textAlign:align,writingDirection:direction}]}>{text.recoveryBody}</Text>
    <FormField label={text.email} value={email} onChangeText={setEmail} keyboardType="email-address"/>
    <AppButton label={text.sendRecovery} loading={busy} onPress={submit}/>
    {message?<Text style={[styles.body,{textAlign:align,writingDirection:direction}]}>{message}</Text>:null}
    <AppButton label={text.resetTitle} variant="secondary" onPress={()=>router.push("/(auth)/reset-password")}/>
  </View></Screen>;
}
const styles=StyleSheet.create({stack:{gap:theme.spacing.md,paddingTop:theme.spacing.xl},title:{fontSize:theme.typography.title,fontWeight:"800",color:theme.colors.text},body:{color:theme.colors.mutedText,lineHeight:25}});
