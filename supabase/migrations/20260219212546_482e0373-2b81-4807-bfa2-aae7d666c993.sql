-- Recreate the trigger to auto-create profiles on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also recreate the auto admin role trigger
CREATE OR REPLACE TRIGGER on_auth_user_created_admin_check
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();