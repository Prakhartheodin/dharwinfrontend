import React, { useEffect } from "react";

const Backtotop = () => {
	const screenUp = () => {
		window.scrollTo(0, 0);
	};

	useEffect(() => {
		const handleScroll = () => {
			const color:any = document.getElementsByClassName("scrollToTop")[0];
			if (color) {
				window.scrollY > 100 ? (color.style.display = "flex") : (color.style.display = "none");
			}
		};

		window.addEventListener("scroll", handleScroll);

		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);
	return (
		<div
			className="scrollToTop fixed bottom-20 start-5 z-10 hidden h-10 w-10 cursor-pointer items-center justify-center rounded-md bg-primary text-white shadow-lg transition duration-100"
			onClick={screenUp}
		>
			<span className="arrow"><i className="ri-arrow-up-s-fill text-xl"></i></span>
		</div>
	);
};

export default Backtotop;
