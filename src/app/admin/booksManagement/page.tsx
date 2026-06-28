import { InsertBooksPanel } from "@/component/admin/InsertBookPanel";
import { RentBookPanel } from "@/component/admin/RentBookPanel";
import { ReturnBookPanel } from "@/component/admin/ReturnBookPanel";

export default function booksManagementPage(){
  return(
    <div>
      <InsertBooksPanel/>
      <RentBookPanel/>
      <ReturnBookPanel/>
    </div>
  );
}