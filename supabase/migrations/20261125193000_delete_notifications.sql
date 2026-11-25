grant delete on public.notifications to authenticated;
create policy notifications_delete on public.notifications for delete to authenticated
 using ((select public.is_staff()) and recipient_id = (select auth.uid()));
