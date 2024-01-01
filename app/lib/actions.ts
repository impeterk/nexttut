'use server'

import {z} from 'zod'
import {sql} from '@vercel/postgres'
import {revalidatePath} from "next/cache"
import {redirect} from 'next/navigation'
import {getUser, signIn} from "@/auth"
import {AuthError} from "next-auth"
import bcrypt from 'bcrypt'

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string()
})



const CreateInvoice = FormSchema.omit({id:true, date:true})

export async function createInvoice(formData: FormData) {
const {customerId, amount, status} = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status')
})

const amountInCents = amount * 100
const date = new Date().toISOString().split('T')[0]

try {
    
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`
} catch (error) {
return {
    message: 'Database Error: Failed to create Invoice.'
}
}

revalidatePath('/dashboard/invoices')
redirect('/dashboard/invoices')
}

const UpdateInvoice = FormSchema.omit({id: true, date: true})

export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
      });

      const amountInCents = amount * 100;
 try {
    
     await sql`
       UPDATE invoices
       SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
       WHERE id = ${id}
           `;
 } catch (error) {
return {
    message: "Database error: Failed to update Invoice"
}    
}
     
      revalidatePath('/dashboard/invoices');
      redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    try {
        
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        return { message: 'Deleted Invoice.' };
    } catch (error) {
return {
    message: "Database error: Failed to delte invoice"
}        
    }
    revalidatePath('/dashboard/invoices');
  }

  export async function authenticate(prevState: string | undefined,
    formData: FormData,) {
    try {
        await signIn('credentials', formData)
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                return 'Invalid credentials';
                default:
                    return 'Something went wrong'
            }
        }
        throw error
    }
  }

  export async function registerUser(prevState: string |undefined, formData: FormData) {
    try {
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        if (!email || !password) return 'No email or password provided'

        const user = await getUser(email)
        if (user) return 'User already exist'

        const hashedPassword = await bcrypt.hash(password, 10)
        const addUser = await sql`
        INSERT INTO users (Name, Email, Password)
        VALUES (${email}, ${email}, ${hashedPassword})`

        
    } catch (error) {
        console.log(error)
        return 'something went wrong'
    }
    redirect('/login')
  }