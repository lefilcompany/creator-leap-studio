import { supabase } from "@/integrations/supabase/client";

export async function resetUserPassword(email: string, newPassword: string) {
  try {
    const { data, error } = await supabase.functions.invoke('reset-user-password', {
      body: {
        email,
        newPassword
      }
    });

    if (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error.message };
    }

    console.log('Password reset successfully:', data);
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Call the function immediately
resetUserPassword('emanuel.rodrigues1@lefil.com.br', '123456')
  .then(result => {
    console.log('Result:', result);
  })
  .catch(error => {
    console.error('Error:', error);
  });
