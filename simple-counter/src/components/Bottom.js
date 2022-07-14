import { useSelector } from "react-redux";

const Bottom = () => {
    const count = useSelector((state) => state.counter.value);
    return (
        <>
            <div>
                {`I am Redux state ${count}`}
            </div>
        </>
    )
}

export default Bottom;