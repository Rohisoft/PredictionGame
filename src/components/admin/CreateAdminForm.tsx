import { CreateAccountForm } from "@/components/admin/CreateAccountForm";
import { useSuperAdminCreateAdmin } from "@/hooks/useAdmin";

export function CreateAdminForm() {
  return (
    <CreateAccountForm
      idPrefix="new-admin"
      submitLabel="Create admin account"
      successMessage={(username) => `Admin account created for @${username}. They start with 0 points — recharge them below.`}
      helpText="Admins start with 0 points. Recharge them from the list below before they can give points to their own players."
      useCreateAccount={useSuperAdminCreateAdmin}
    />
  );
}
