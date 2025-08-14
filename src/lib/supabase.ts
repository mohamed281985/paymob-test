import { createClient } from '@supabase/supabase-js'

// استبدل هذه القيم بالقيم الخاصة بمشروع Supabase الخاص بك
const supabaseUrl = 'https://idpnvgvamdedaynetjvm.supabase.co' // ضع هنا عنوان URL الصحيح
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkcG52Z3ZhbWRlZGF5bmV0anZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NDQyNzMsImV4cCI6MjA2MjMyMDI3M30.MkMaSgmXUDPD1875MoW3h-SPXPBKFvPGSqlW3gWHddY' // ضع هنا مفتاح anon الصحيح

console.log('Supabase URL being used:', supabaseUrl);
console.log('Supabase Anon Key being used:', supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey)