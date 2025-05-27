import React from 'react'
import '../style/LobbySlider.css'
import '../style/Global.css'
import {SwiperSlide, Swiper} from 'swiper/react';
import 'swiper/css';
import 'swiper/css/effect-flip';
import { EffectFlip, Autoplay} from 'swiper/modules';
import goldenSnake from '../img/GoldenSnake.png';
import sheriff from '../img/Sheriff.png';
import hidden from '../img/HiddenCard.png';
function LobbySlider() {

  return (
    <div>
        <Swiper
            slidesPerView={1}
            centeredSlides={true}
            effect={'flip'}
            grabCursor={true}
            loop={true}
            modules={[EffectFlip, Autoplay]}
            autoplay={{
                delay: 5500,
                disableOnInteraction: false,
            }}
        >
            <SwiperSlide >
                <div className='slider-body fonts'>
                    <h1>Zbierz swoją bandę</h1>
                    <img src={goldenSnake} alt='Golden Snake' className='SliderImg'/>
                    <p>Stwórz nowy pokój w saloonie lub dołącz do istniejącego.</p>
                </div>  
            </SwiperSlide>
            <SwiperSlide >
                <div className='slider-body fonts'>
                    <h1>Ukryj swoją kartę</h1>
                    <img src={hidden} alt='Hidden Card'/>
                    <p><strong>Jesteś Bandytą?</strong> <br/> Blefuj, że odpowiadasz jak szeryf. <br/> <strong>Jesteś Szeryfem?</strong><br/>Wystrzel fałszywe odpowiedzi.</p>
                </div>  
            </SwiperSlide>
            <SwiperSlide >
                <div className='slider-body fonts'>
                    <h1>Rozstrzygnij showdown</h1>
                    <img src={sheriff} alt='Make your choice'/>
                    <p>Wskaż bandytę, zanim wystrzeli ci w plecy. <br/>Za każdy trafny strzał – złota sztabka w kieszeni!</p>
                </div>  
            </SwiperSlide>
        </Swiper>
    </div>
  )
}

export default LobbySlider
