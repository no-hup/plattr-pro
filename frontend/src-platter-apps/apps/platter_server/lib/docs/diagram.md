graph TD

    A[Home Screen<br>Contains Tabs];

    subgraph OrdersHome [Orders Home Tab]
        direction TB
        orders_list[Order Cards List<br>- Order ID, Table ID<br>- Color-coded Status (Preparing, Delivered, etc.)]
        orders_list -- Click Order Card --> CartDetailPage
    end

    subgraph TablesHome [Tables Home Tab]
        direction TB
        tables_list[Table Pills List<br>- Table ID, Capacity, Status (Active, Vacant, etc.)<br>- Backend Sorting]
        tables_list -- Click Table Pill --> TablePopup
    end

    subgraph MenuHome [Menu Home Tab]
        direction TB
        menu_list[Menu Item List<br>- Item Name, Details]
        menu_actions[Functionality:<br>- Mark Item Out of Stock]
        menu_list --> menu_actions
        menu_actions -- (Action within page) --> menu_list
    end

    subgraph TablePopup [Table Popup<br>Table Management]
        direction TB
        table_status_mgmt[Status Management Options<br>- Mark as Vacant, Closed, Reserved, Disabled]
        order_done_btn[Mark Order Done Button]
        order_details_link["Order Details Link<br>(View History)"]
        otp_section[OTP Section<br>- Display Table OTP<br>- Refresh Button]

        order_details_link -- Click Link --> PreviousOrdersPage
        table_status_mgmt -- (Action within Popup) --> table_status_mgmt
        order_done_btn -- (Action within Popup) --> order_done_btn
        otp_section -- Click Refresh --> otp_section
    end

    subgraph CartDetailPage [Cart Detail Page<br>Order Details]
        direction TB
        carts_display[Carts & Items Display<br>- Each cart as dropdown<br>- Items inside]
        item_actions[Item Level Actions/Display<br>- Remove Item Option<br>- Delivered Checkbox<br>- Add Notes Field<br>- Statuses (Cancelled, Delivered, etc.)]

        carts_display --> item_actions
        item_actions -- (Actions within Page) --> carts_display
    end

    subgraph PreviousOrdersPage [Previous Orders Page<br>Table Order History]
        direction TB
        orders_history_list[Orders List (Latest First)<br>- Active Order (top)<br>- Up to 10 Previous Orders<br>- Displays items per order]

        orders_history_list -- Click Any Order --> CartDetailPage
    end

    A --> orders_list;
    A --> tables_list;
    A --> menu_list;

    TablesHome -- navigates to --> TablePopup
    TablePopup -- views history --> PreviousOrdersPage
    PreviousOrdersPage -- views details of selected order --> CartDetailPage
    OrdersHome -- views details of selected order --> CartDetailPage