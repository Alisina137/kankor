import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@kankor/config";
import { AppButton } from "../../components/app-button";
import { FormField } from "../../components/form-field";
import { Screen } from "../../components/screen";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

export default function RegisterScreen() {
  const { register } = useAuth();
  const { direction, text } = useLocale();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState("");
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const align=direction==="rtl"?"right":"left";

  async function submit(){
    setError("");
    if(!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(text.invalidEmail);
    if(password.length<8) return setError(text.passwordLength);
    if(password!==confirm) return setError(text.passwordMismatch);
    setBusy(true);
    try { await register(email,password); router.replace("/onboarding"); }
    catch(e){ const code=e instanceof ApiError?e.code:""; setError(code==="email_already_registered"?text.emailExists:code==="network_error"?text.networkError:text.genericError); }
    finally{ setBusy(false); }
  }

  return <Screen><View style={styles.stack}>
    <Text style={[styles.title,{textAlign:align}]}>{text.createAccount}</Text>
    <FormField label={text.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
    <FormField label={text.password} value={password} onChangeText={setPassword} secureTextEntry secureToggle autoComplete="new-password" />
    <FormField label={text.confirmPassword} value={confirm} onChangeText={setConfirm} secureTextEntry secureToggle autoComplete="new-password" />
    {error?<Text style={[styles.error,{textAlign:align}]}>{error}</Text>:null}
    <AppButton label={text.createAccount} loading={busy} onPress={submit}/>
    <Pressable onPress={()=>router.push("/(auth)/login")}><Text style={styles.link}>{text.haveAccount} {text.signIn}</Text></Pressable>
  </View></Screen>;
}
const styles=StyleSheet.create({stack:{gap:theme.spacing.md,paddingTop:theme.spacing.xl},title:{fontSize:theme.typography.title,fontWeight:"800",color:theme.colors.text,marginBottom:theme.spacing.md},error:{color:theme.colors.danger},link:{color:theme.colors.primary,textAlign:"center",padding:theme.spacing.sm}});
