import { CreateAccountForm } from "@/components/admin/CreateAccountForm";
import { useAdminCreateUser } from "@/hooks/useAdmin";

export function CreateUserForm() {
  return (
    <CreateAccountForm
      idPrefix="new-user"
      submitLabel="Create account"
      successMessage={(username) => `Account created for @${username}. Share the username and initial password with them.`}
      helpText="The person signs in with this username and password, then changes the password themselves on first login."
      useCreateAccount={useAdminCreateUser}
    />
  );
}
